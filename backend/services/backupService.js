// ============================================================
// BACKUP SERVICE
// Human-Readable TXT Backup System
// ============================================================

const mongoose = require('mongoose');
const archiver = require('archiver');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');

// ============================================================
// MODELS
// ============================================================

const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Installment = require('../models/Installment');
const InstallmentPlan = require('../models/InstallmentPlan');
const Expense = require('../models/Expense');
const Return = require('../models/Return');
const StockMovement = require('../models/StockMovement');
const Shop = require('../models/Shop');

// ============================================================
// CONFIG
// ============================================================

const BACKUP_VERSION = '10.0.0';
const TIME_ZONE = 'Asia/Karachi';

// ============================================================
// BACKUP LOCATION
//
// Desktop/
// └── BACKUP/
//     ├── COMPLETE-BACKUP/
//     └── DAILY-BACKUPS/
//         ├── 2026-09-23/
//         ├── 2026-09-24/
//         └── ...
// ============================================================

const BACKUP_ROOT = path.join(
  process.env.USERPROFILE || os.homedir(),
  'Desktop'
);

const BACKUP_FOLDER_NAME = 'BACKUP';
const COMPLETE_FOLDER_NAME = 'COMPLETE-BACKUP';
const DAILY_FOLDER_NAME = 'DAILY-BACKUPS';

// ============================================================
// BACKUP PATHS
// ============================================================

const getBackupPaths = () => {
  const backupDir = path.join(
    BACKUP_ROOT,
    BACKUP_FOLDER_NAME
  );

  const completeDir = path.join(
    backupDir,
    COMPLETE_FOLDER_NAME
  );

  const dailyDir = path.join(
    backupDir,
    DAILY_FOLDER_NAME
  );

  return {
    backupDir,
    completeDir,
    dailyDir,
  };
};

// ============================================================
// ENSURE BACKUP STRUCTURE
// ============================================================

const ensureBackupStructure = async () => {
  const {
    backupDir,
    completeDir,
    dailyDir,
  } = getBackupPaths();

  await fsp.mkdir(
    backupDir,
    {
      recursive: true,
    }
  );

  await fsp.mkdir(
    completeDir,
    {
      recursive: true,
    }
  );

  await fsp.mkdir(
    dailyDir,
    {
      recursive: true,
    }
  );

  return {
    backupDir,
    completeDir,
    dailyDir,
  };
};

// ============================================================
// INITIALIZE
// ============================================================

const initializeBackupStorage = async () => {
  return ensureBackupStructure();
};

// ============================================================
// BACKUP MODELS
// ============================================================

const BACKUP_MODELS = {
  customers: Customer,
  products: Product,
  sales: Sale,
  payments: Payment,
  installments: Installment,
  installmentPlans: InstallmentPlan,
  expenses: Expense,
  returns: Return,
  stockMovements: StockMovement,
};

// ============================================================
// EXCLUDED FIELDS
//
// Fingerprint / FMD / biometric / live image data
// will NEVER be included.
// ============================================================

const EXCLUDED_FIELDS = new Set([
  'fingerprint',
  'fingerprintfmd',
  'fingerprinttemplate',
  'fingerprintdata',
  'fmd',
  'fmddata',
  'fmdtemplate',
  'template',
  'templatedata',
  'liveimage',
  'liveimagedata',
  'capturedimage',
  'capturedimagedata',
  'fingerprintimage',
  'fingerprintimagedata',
  'fingerprintbuffer',
  'fingerprinttemplatedata',
  'biometric',
  'biometricdata',
  'fingerprintcapturedat',
]);

// ============================================================
// BACKUP-ONLY FIELDS
// ============================================================

const BACKUP_ONLY_FIELDS = new Set([
  'backupCustomerName',
  'backupCustomerId',
  'backupInvoiceNumber',
  'backupProductName',
  'backupProductId',
  'backupInstallmentPlanId',
  'backupSaleId',
  'backupInstallmentId',
  'backupPlanDurationMonths',
  'backupPlanDownPayment',
  'backupPlanTotalAmount',
  'backupPlanInstallmentAmount',
  'backupPlanTotalInstallments',
]);

// ============================================================
// OBJECT ID
// ============================================================

const toObjectId = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value._id
  ) {
    return toObjectId(value._id);
  }

  const stringValue = String(value).trim();

  if (
    !/^[a-fA-F0-9]{24}$/.test(
      stringValue
    )
  ) {
    return null;
  }

  try {
    return new mongoose.Types.ObjectId(
      stringValue
    );
  } catch (error) {
    console.error(
      '[BACKUP] ObjectId conversion failed:',
      error.message
    );

    return null;
  }
};

// ============================================================
// PAKISTAN DATE
// ============================================================

const getPakistanDate = () => {
  return new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date());
};

// ============================================================
// FORMAT PAKISTAN DATE/TIME
// ============================================================

const formatPakistanDate = (date) => {
  if (!date) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }
    ).format(new Date(date));
  } catch {
    return String(date);
  }
};

// ============================================================
// SAFE FILE NAME
// ============================================================

const sanitizeFileName = (value) => {
  return String(value || 'Unknown')
    .replace(
      /[<>:"/\\|?*\x00-\x1F]/g,
      '-'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
};

// ============================================================
// VALID BACKUP DATE
// ============================================================

const isValidBackupDate = (date) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(date)
  );
};

// ============================================================
// FORMAT FIELD NAME
// ============================================================

const formatFieldName = (key) => {
  return String(key)
    .replace(
      /([a-z])([A-Z])/g,
      '$1 $2'
    )
    .replace(
      /[_-]+/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
    )
    .replace(
      /^./,
      (char) => char.toUpperCase()
    )
    .trim();
};

// ============================================================
// DATE KEY DETECTION
// ============================================================

const isDateKey = (key) => {
  const normalized =
    String(key).toLowerCase();

  return (
    normalized.includes('date') ||
    normalized.endsWith('at') ||
    normalized === 'dob' ||
    normalized === 'expiry' ||
    normalized === 'expires' ||
    normalized === 'created' ||
    normalized === 'updated'
  );
};

// ============================================================
// FORMAT DATE
// ============================================================

const formatDate = (value) => {
  if (!value) {
    return '';
  }

  try {
    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return formatPakistanDate(
        parsed
      );
    }
  } catch {
    // Ignore
  }

  return String(value);
};

// ============================================================
// FORMAT NUMBER
// ============================================================

const formatNumber = (value) => {
  if (
    typeof value !== 'number'
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    'en-PK',
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
};

// ============================================================
// FORMAT SIMPLE VALUE
// ============================================================

const formatSimpleValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Not Available';
  }

  if (
    typeof value === 'boolean'
  ) {
    return value
      ? 'Yes'
      : 'No';
  }

  if (
    typeof value === 'number'
  ) {
    return formatNumber(value);
  }

  if (
    value instanceof Date
  ) {
    return formatPakistanDate(
      value
    );
  }

  return String(value);
};

// ============================================================
// CLEAN OBJECT
//
// Removes:
// - Mongo internal fields
// - fingerprints
// - FMD
// - templates
// - live images
// - biometric data
//
// Keeps normal business data.
// ============================================================

const cleanObject = (
  value,
  currentKey = ''
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  const lowerKey =
    String(currentKey)
      .toLowerCase();

  // ----------------------------------------------------------
  // DIRECT EXCLUDED KEY
  // ----------------------------------------------------------

  if (
    EXCLUDED_FIELDS.has(
      lowerKey
    ) ||
    lowerKey.includes(
      'fingerprint'
    ) ||
    lowerKey.includes(
      'biometric'
    ) ||
    lowerKey === 'fmd' ||
    lowerKey.includes(
      'fmd'
    ) ||
    lowerKey.includes(
      'template'
    ) ||
    lowerKey.includes(
      'liveimage'
    ) ||
    lowerKey.includes(
      'capturedimage'
    )
  ) {
    return undefined;
  }

  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  if (
    value instanceof Date
  ) {
    return value;
  }

  // ----------------------------------------------------------
  // OBJECT ID
  // ----------------------------------------------------------

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value.toString();
  }

  // ----------------------------------------------------------
  // BUFFER / BINARY
  // ----------------------------------------------------------

  if (
    Buffer.isBuffer(value)
  ) {
    return undefined;
  }

  // ----------------------------------------------------------
  // DECIMAL128
  // ----------------------------------------------------------

  if (
    value &&
    value._bsontype === 'Decimal128'
  ) {
    return value.toString();
  }

  // ----------------------------------------------------------
  // MONGOOSE BUFFER-LIKE
  // ----------------------------------------------------------

  if (
    value &&
    value._bsontype === 'Binary'
  ) {
    return undefined;
  }

  // ----------------------------------------------------------
  // ARRAYS
  // ----------------------------------------------------------

  if (
    Array.isArray(value)
  ) {
    return value
      .map((item) =>
        cleanObject(
          item,
          currentKey
        )
      )
      .filter(
        (item) =>
          item !== undefined
      );
  }

  // ----------------------------------------------------------
  // OBJECTS
  // ----------------------------------------------------------

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const result = {};

    for (const [
      key,
      childValue,
    ] of Object.entries(value)) {

      const lower =
        String(key).toLowerCase();

      // ------------------------------------------------------
      // REMOVE MONGO INTERNAL FIELDS
      // KEEP _id
      // ------------------------------------------------------

      if (
        lower.startsWith('_') &&
        lower !== '_id'
      ) {
        continue;
      }

      // ------------------------------------------------------
      // REMOVE EXCLUDED DATA
      // ------------------------------------------------------

      if (
        EXCLUDED_FIELDS.has(
          lower
        ) ||
        lower.includes(
          'fingerprint'
        ) ||
        lower.includes(
          'biometric'
        ) ||
        lower === 'fmd' ||
        lower.includes(
          'fmd'
        ) ||
        lower.includes(
          'template'
        ) ||
        lower.includes(
          'liveimage'
        ) ||
        lower.includes(
          'capturedimage'
        )
      ) {
        continue;
      }

      const cleaned =
        cleanObject(
          childValue,
          key
        );

      if (
        cleaned !== undefined
      ) {
        result[key] = cleaned;
      }
    }

    return result;
  }

  return value;
};

// ============================================================
// INDENT TEXT
// ============================================================

const indentText = (
  text,
  spaces = 2
) => {
  const prefix =
    ' '.repeat(spaces);

  return String(text)
    .split('\n')
    .map(
      (line) =>
        prefix + line
    )
    .join('\n');
};

// ============================================================
// VALUE TO TEXT
// ============================================================

const valueToText = (
  value,
  key = '',
  level = 0
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Not Available';
  }

  // ----------------------------------------------------------
  // DATE
  // ----------------------------------------------------------

  if (
    value instanceof Date ||
    isDateKey(key)
  ) {
    if (
      value instanceof Date ||
      !Number.isNaN(
        new Date(value).getTime()
      )
    ) {
      return formatDate(
        value
      );
    }
  }

  // ----------------------------------------------------------
  // BOOLEAN
  // ----------------------------------------------------------

  if (
    typeof value === 'boolean'
  ) {
    return value
      ? 'Yes'
      : 'No';
  }

  // ----------------------------------------------------------
  // NUMBER
  // ----------------------------------------------------------

  if (
    typeof value === 'number'
  ) {
    return formatNumber(
      value
    );
  }

  // ----------------------------------------------------------
  // STRING
  // ----------------------------------------------------------

  if (
    typeof value === 'string' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  // ----------------------------------------------------------
  // ARRAY
  // ----------------------------------------------------------

  if (
    Array.isArray(value)
  ) {
    if (
      value.length === 0
    ) {
      return 'None';
    }

    return value
      .map(
        (
          item,
          index
        ) => {
          if (
            typeof item === 'object' &&
            item !== null
          ) {
            return (
              `[${index + 1}]\n` +
              indentText(
                objectToText(
                  item,
                  level + 1
                ),
                2
              )
            );
          }

          return (
            `[${index + 1}] ` +
            valueToText(
              item,
              key,
              level + 1
            )
          );
        }
      )
      .join('\n');
  }

  // ----------------------------------------------------------
  // OBJECT
  // ----------------------------------------------------------

  if (
    typeof value === 'object'
  ) {
    return objectToText(
      value,
      level + 1
    );
  }

  return String(value);
};

// ============================================================
// OBJECT TO TEXT
// ============================================================

const objectToText = (
  object,
  level = 0
) => {
  if (
    !object ||
    typeof object !== 'object'
  ) {
    return valueToText(
      object,
      '',
      level
    );
  }

  return Object.entries(
    object
  )
    .map(
      ([key, value]) => {
        const label =
          formatFieldName(
            key
          );

        const rendered =
          valueToText(
            value,
            key,
            level
          );

        if (
          rendered.includes(
            '\n'
          )
        ) {
          return (
            `${label}:\n` +
            indentText(
              rendered,
              2
            )
          );
        }

        return (
          `${label}: ${rendered}`
        );
      }
    )
    .join('\n');
};

// ============================================================
// SEPARATOR
// ============================================================

const separator = (
  char = '=',
  length = 72
) => {
  return char.repeat(
    length
  );
};

// ============================================================
// TITLE
// ============================================================

const makeTitle = (
  title
) => {
  return (
    separator() +
    '\n' +
    title +
    '\n' +
    separator() +
    '\n'
  );
};

// ============================================================
// COLLECTION DISPLAY NAME
// ============================================================

const collectionDisplayName = (
  collectionName
) => {
  const names = {
    customers: 'CUSTOMERS',
    products: 'PRODUCTS',
    sales: 'SALES',
    payments: 'PAYMENTS',
    installments: 'INSTALLMENTS',
    installmentPlans:
      'INSTALLMENT PLANS',
    expenses: 'EXPENSES',
    returns: 'RETURNS',
    stockMovements:
      'STOCK MOVEMENTS',
  };

  return (
    names[collectionName] ||
    String(
      collectionName
    ).toUpperCase()
  );
};

// ============================================================
// ID STRING
// ============================================================

const getIdString = (
  value
) => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '';
  }

  if (
    value instanceof mongoose.Types.ObjectId
  ) {
    return value.toString();
  }

  if (
    typeof value === 'object' &&
    value._id
  ) {
    return String(
      value._id
    );
  }

  return String(value);
};

// ============================================================
// FIRST VALUE
// ============================================================

const getFirstValue = (
  object,
  keys
) => {
  if (!object) {
    return '';
  }

  for (const key of keys) {
    if (
      object[key] !== undefined &&
      object[key] !== null &&
      object[key] !== ''
    ) {
      return object[key];
    }
  }

  return '';
};

// ============================================================
// REFERENCE ID
// ============================================================

const getReferenceId = (
  record,
  keys
) => {
  const value =
    getFirstValue(
      record,
      keys
    );

  return getIdString(
    value
  );
};

// ============================================================
// FIND BY ID FROM MAP
// ============================================================

const findByIdFromMap = (
  map,
  id
) => {
  if (
    !id ||
    !map
  ) {
    return null;
  }

  return (
    map.get(
      getIdString(id)
    ) || null
  );
};

// ============================================================
// BUILD ID MAP
// ============================================================

const buildIdMap = (
  records = []
) => {
  const map =
    new Map();

  for (
    const record of records
  ) {
    const id =
      getIdString(
        record?._id
      );

    if (id) {
      map.set(
        id,
        record
      );
    }
  }

  return map;
};

// ============================================================
// CUSTOMER NAME
// ============================================================

const getCustomerName = (
  customer
) => {
  if (!customer) {
    return 'Unknown Customer';
  }

  return (
    getFirstValue(
      customer,
      [
        'fullName',
        'name',
        'customerName',
      ]
    ) ||
    'Unknown Customer'
  );
};

// ============================================================
// PRODUCT NAME
// ============================================================

const getProductName = (
  product
) => {
  if (!product) {
    return 'Unknown Product';
  }

  const brand =
    getFirstValue(
      product,
      ['brand']
    );

  const model =
    getFirstValue(
      product,
      [
        'model',
        'name',
        'productName',
      ]
    );

  const combined = [
    brand,
    model,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    combined ||
    getFirstValue(
      product,
      [
        'productName',
        'name',
      ]
    ) ||
    'Unknown Product'
  );
};

// ============================================================
// INVOICE NUMBER
// ============================================================

const getInvoiceNumber = (
  sale
) => {
  if (!sale) {
    return '';
  }

  return (
    getFirstValue(
      sale,
      [
        'invoiceNumber',
        'invoiceNo',
        'invoice',
        'saleNumber',
        'number',
      ]
    ) || ''
  );
};

// ============================================================
// ENRICH SALES
// ============================================================

const enrichSales = (
  sales = [],
  maps
) => {
  return sales.map(
    (sale) => {

      const customerId =
        getReferenceId(
          sale,
          [
            'customerId',
            'customer',
          ]
        );

      const productId =
        getReferenceId(
          sale,
          [
            'productId',
            'product',
          ]
        );

      const customer =
        findByIdFromMap(
          maps.customers,
          customerId
        );

      const product =
        findByIdFromMap(
          maps.products,
          productId
        );

      return {
        ...sale,

        backupCustomerName:
          getCustomerName(
            customer
          ),

        backupCustomerId:
          customerId ||
          'Not Available',

        backupProductName:
          getProductName(
            product
          ),

        backupProductId:
          productId ||
          'Not Available',

        backupInvoiceNumber:
          getInvoiceNumber(
            sale
          ),
      };
    }
  );
};

// ============================================================
// ENRICH INSTALLMENT PLANS
// ============================================================

const enrichInstallmentPlans = (
  plans = [],
  maps
) => {
  return plans.map(
    (plan) => {

      const customerId =
        getReferenceId(
          plan,
          [
            'customerId',
            'customer',
          ]
        );

      const saleId =
        getReferenceId(
          plan,
          [
            'saleId',
            'sale',
          ]
        );

      const customer =
        findByIdFromMap(
          maps.customers,
          customerId
        );

      const sale =
        findByIdFromMap(
          maps.sales,
          saleId
        );

      const durationMonths =
        getFirstValue(
          plan,
          [
            'durationMonths',
            'months',
            'duration',
          ]
        );

      const downPayment =
        getFirstValue(
          plan,
          [
            'downPayment',
            'advancePayment',
          ]
        );

      const totalAmount =
        getFirstValue(
          plan,
          [
            'totalAmount',
            'grandTotal',
            'amount',
          ]
        );

      const installmentAmount =
        getFirstValue(
          plan,
          [
            'installmentAmount',
            'monthlyInstallment',
            'perInstallment',
          ]
        );

      const totalInstallments =
        getFirstValue(
          plan,
          [
            'totalInstallments',
            'numberOfInstallments',
            'installmentsCount',
          ]
        );

      return {
        ...plan,

        backupCustomerName:
          getCustomerName(
            customer
          ),

        backupCustomerId:
          customerId ||
          'Not Available',

        backupSaleId:
          saleId ||
          'Not Available',

        backupInvoiceNumber:
          getInvoiceNumber(
            sale
          ),

        backupInstallmentPlanId:
          getIdString(
            plan?._id
          ),

        backupPlanDurationMonths:
          durationMonths,

        backupPlanDownPayment:
          downPayment,

        backupPlanTotalAmount:
          totalAmount,

        backupPlanInstallmentAmount:
          installmentAmount,

        backupPlanTotalInstallments:
          totalInstallments,
      };
    }
  );
};

// ============================================================
// ENRICH INSTALLMENTS
// ============================================================

const enrichInstallments = (
  installments = [],
  maps
) => {
  return installments.map(
    (installment) => {

      const customerId =
        getReferenceId(
          installment,
          [
            'customerId',
            'customer',
          ]
        );

      const saleId =
        getReferenceId(
          installment,
          [
            'saleId',
            'sale',
          ]
        );

      const planId =
        getReferenceId(
          installment,
          [
            'installmentPlanId',
            'planId',
            'plan',
          ]
        );

      const customer =
        findByIdFromMap(
          maps.customers,
          customerId
        );

      const sale =
        findByIdFromMap(
          maps.sales,
          saleId
        );

      return {
        ...installment,

        backupCustomerName:
          getCustomerName(
            customer
          ),

        backupCustomerId:
          customerId ||
          'Not Available',

        backupSaleId:
          saleId ||
          'Not Available',

        backupInvoiceNumber:
          getInvoiceNumber(
            sale
          ),

        backupInstallmentPlanId:
          planId ||
          'Not Available',

        backupInstallmentId:
          getIdString(
            installment?._id
          ),
      };
    }
  );
};

// ============================================================
// ENRICH PAYMENTS
// ============================================================

const enrichPayments = (
  payments = [],
  maps
) => {
  return payments.map(
    (payment) => {

      const customerId =
        getReferenceId(
          payment,
          [
            'customerId',
            'customer',
          ]
        );

      const saleId =
        getReferenceId(
          payment,
          [
            'saleId',
            'sale',
          ]
        );

      const installmentId =
        getReferenceId(
          payment,
          [
            'installmentId',
            'installment',
          ]
        );

      const customer =
        findByIdFromMap(
          maps.customers,
          customerId
        );

      const sale =
        findByIdFromMap(
          maps.sales,
          saleId
        );

      return {
        ...payment,

        backupCustomerName:
          getCustomerName(
            customer
          ),

        backupCustomerId:
          customerId ||
          'Not Available',

        backupSaleId:
          saleId ||
          'Not Available',

        backupInvoiceNumber:
          getInvoiceNumber(
            sale
          ),

        backupInstallmentId:
          installmentId ||
          'Not Available',
      };
    }
  );
};

// ============================================================
// CREATE COLLECTION TEXT
// ============================================================

const createCollectionText = (
  collectionName,
  records = []
) => {
  const displayName =
    collectionDisplayName(
      collectionName
    );

  let text = '';

  text += makeTitle(
    displayName
  );

  text +=
    `Collection: ${collectionName}\n`;

  text +=
    `Total Records: ${records.length}\n`;

  text +=
    `Generated: ${formatPakistanDate(
      new Date()
    )}\n`;

  text += '\n';

  text += separator(
    '-'
  );

  text += '\n\n';

  if (
    !records.length
  ) {
    text +=
      'No records found.\n';

    return text;
  }

  records.forEach(
    (record, index) => {

      text +=
        `RECORD #${index + 1}\n`;

      text += separator(
        '-',
        60
      );

      text += '\n';

      const cleaned =
        cleanObject(
          record
        );

      text += objectToText(
        cleaned
      );

      text += '\n\n';

      text += separator(
        '-'
      );

      text += '\n\n';
    }
  );

  return text;
};

// ============================================================
// SHOP TEXT
// ============================================================

const createShopText = (
  shop
) => {
  let text = '';

  text += makeTitle(
    'SHOP INFORMATION'
  );

  const cleaned =
    cleanObject(
      shop
    );

  text += objectToText(
    cleaned
  );

  text += '\n';

  return text;
};

// ============================================================
// README
// ============================================================

const createReadmeText = (
  metadata
) => {
  return `${makeTitle(
    'SHOP MANAGEMENT BACKUP'
  )}

Backup Version: ${metadata.backupVersion}
Backup Type: ${metadata.backupType}
Backup Date: ${metadata.backupDate}
Created At: ${metadata.createdAt}
Database: ${metadata.database}
Format: Human-Readable TXT

SHOP
----

Shop ID: ${metadata.shopId}
Shop Name: ${metadata.shopName}

CONTENTS
--------

This backup contains readable TXT files containing the shop's business records.

Included:

- Customers
- Products
- Sales
- Payments
- Installments
- Installment Plans
- Expenses
- Returns
- Stock Movements
- Shop Information

EXCLUDED DATA
-------------

- Fingerprint data
- Fingerprint templates
- FMD data
- Biometric data
- Fingerprint images
- Live/captured biometric images
- Fingerprint buffers

IMPORTANT
---------

This backup is intended for business-data recovery and record keeping.

Daily backups represent the complete snapshot saved for that particular date.

A historical date cannot be reconstructed from today's MongoDB data if a snapshot
was not actually saved on that date.

${separator()}
`;
};

// ============================================================
// BACKUP INFO
// ============================================================

const createBackupInfoText = (
  metadata
) => {
  let text = '';

  text += makeTitle(
    'BACKUP INFORMATION'
  );

  text +=
    `Backup Version: ${metadata.backupVersion}\n`;

  text +=
    `Backup Type: ${metadata.backupType}\n`;

  text +=
    `Database: ${metadata.database}\n`;

  text +=
    `Format: ${metadata.format}\n`;

  text +=
    `Created At: ${metadata.createdAt}\n`;

  text +=
    `Backup Date: ${metadata.backupDate}\n`;

  text +=
    `Shop ID: ${metadata.shopId}\n`;

  text +=
    `Shop Name: ${metadata.shopName}\n`;

  text +=
    `Total Documents: ${metadata.totalDocuments}\n`;

  text +=
    `Restore Compatible: ${
      metadata.restoreCompatible
        ? 'Yes'
        : 'No'
    }\n`;

  text +=
    `Generated By: ${metadata.generatedBy}\n`;

  return text;
};

// ============================================================
// BACKUP SUMMARY
// ============================================================

const createBackupSummaryText = (
  metadata
) => {
  let text = '';

  text += makeTitle(
    'BACKUP SUMMARY'
  );

  text +=
    `Shop: ${metadata.shopName}\n`;

  text +=
    `Backup Type: ${metadata.backupType}\n`;

  text +=
    `Backup Date: ${metadata.backupDate}\n`;

  text +=
    `Created At: ${metadata.createdAt}\n\n`;

  text += separator(
    '-'
  );

  text += '\n';

  for (
    const [
      collection,
      count,
    ] of Object.entries(
      metadata.collections
    )
  ) {
    text +=
      `${formatFieldName(
        collection
      )}: ${formatNumber(
        count
      )}\n`;
  }

  text += separator(
    '-'
  );

  text += '\n';

  text +=
    `TOTAL DOCUMENTS: ${formatNumber(
      metadata.totalDocuments
    )}\n`;

  return text;
};

// ============================================================
// LOAD SHOP DATA
//
// IMPORTANT:
// Every collection is checked for shopId.
// ObjectId and String shopId both supported.
// ============================================================

const loadShopData = async (
  shopId
) => {
  console.log('\n');
  console.log(
    '============================================================'
  );
  console.log(
    '[BACKUP] STARTING SHOP DATA LOAD'
  );
  console.log(
    '============================================================'
  );

  console.log(
    '[BACKUP] Received shopId:',
    shopId,
    '| type:',
    typeof shopId
  );

  // ----------------------------------------------------------
  // OBJECT ID
  // ----------------------------------------------------------

  const shopObjId =
    toObjectId(
      shopId
    );

  if (!shopObjId) {
    console.error(
      '[BACKUP] INVALID SHOP ID:',
      shopId
    );

    throw new Error(
      `Invalid shop ID for backup: ${String(
        shopId
      )}`
    );
  }

  console.log(
    '[BACKUP] Valid ObjectId:',
    shopObjId.toString()
  );

  // ----------------------------------------------------------
  // LOAD SHOP
  // ----------------------------------------------------------

  let shop;

  try {
    shop =
      await Shop.findById(
        shopObjId
      ).lean();
  } catch (error) {
    console.error(
      '[BACKUP] Shop query failed:',
      error
    );

    throw new Error(
      `Shop query failed: ${error.message}`
    );
  }

  if (!shop) {
    throw new Error(
      `Shop not found for backup: ${shopObjId.toString()}`
    );
  }

  const shopName =
    getFirstValue(
      shop,
      [
        'shopName',
        'name',
        'businessName',
      ]
    ) ||
    'Unknown Shop';

  console.log(
    '[BACKUP] Shop found:',
    shopName
  );

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const data = {};

  // ----------------------------------------------------------
  // LOAD EVERY BACKUP COLLECTION
  // ----------------------------------------------------------

  for (
    const [
      key,
      Model,
    ] of Object.entries(
      BACKUP_MODELS
    )
  ) {

    console.log('\n');
    console.log(
      '------------------------------------------------------------'
    );

    console.log(
      `[BACKUP] Loading collection: ${key}`
    );

    console.log(
      `[BACKUP] Model: ${
        Model.modelName ||
        'Unknown'
      }`
    );

    try {

      const schemaPaths =
        Model.schema?.paths ||
        {};

      const hasShopId =
        Boolean(
          schemaPaths.shopId
        );

      console.log(
        `[BACKUP] ${key} has shopId field:`,
        hasShopId
      );

      // ------------------------------------------------------
      // COLLECTION WITHOUT SHOP ID
      // ------------------------------------------------------

      if (!hasShopId) {

        console.warn(
          `[BACKUP] WARNING: ${key} has no shopId field.`
        );

        /*
         * Global collection.
         *
         * We still include it so the backup does not
         * silently lose its data.
         */

        data[key] =
          await Model.find({})
            .lean();

        console.log(
          `[BACKUP] ${key}: ${data[key].length} records (GLOBAL COLLECTION)`
        );

        continue;
      }

      // ------------------------------------------------------
      // SHOP ID TYPE
      // ------------------------------------------------------

      const shopIdPath =
        schemaPaths.shopId;

      const instance =
        shopIdPath.instance;

      console.log(
        `[BACKUP] ${key}.shopId type:`,
        instance
      );

      // ------------------------------------------------------
      // OBJECT ID
      // ------------------------------------------------------

      if (
        instance === 'ObjectID' ||
        instance === 'ObjectId'
      ) {

        data[key] =
          await Model.find({
            shopId:
              shopObjId,
          }).lean();

      }

      // ------------------------------------------------------
      // STRING
      // ------------------------------------------------------

      else if (
        instance === 'String'
      ) {

        data[key] =
          await Model.find({
            shopId:
              shopObjId.toString(),
          }).lean();

      }

      // ------------------------------------------------------
      // UNKNOWN
      // ------------------------------------------------------

      else {

        console.warn(
          `[BACKUP] ${key}.shopId has unexpected type: ${instance}`
        );

        try {

          data[key] =
            await Model.find({
              shopId:
                shopObjId,
            }).lean();

        } catch (
          firstError
        ) {

          console.warn(
            `[BACKUP] ObjectId query failed for ${key}. Trying string...`
          );

          data[key] =
            await Model.find({
              shopId:
                shopObjId.toString(),
            }).lean();
        }
      }

      // ------------------------------------------------------
      // RESULT
      // ------------------------------------------------------

      console.log(
        `[BACKUP] ${key}: ${data[key].length} records`
      );

      if (
        data[key].length > 0
      ) {

        const firstRecord =
          data[key][0];

        console.log(
          `[BACKUP] ${key} first record ID:`,
          firstRecord?._id
            ? String(
                firstRecord._id
              )
            : 'No _id'
        );

      } else {

        console.log(
          `[BACKUP] ${key}: NO RECORDS FOUND`
        );
      }

    } catch (error) {

      console.error('\n');
      console.error(
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
      );

      console.error(
        `[BACKUP] FAILED COLLECTION: ${key}`
      );

      console.error(
        '[BACKUP] Error:',
        error
      );

      console.error(
        '[BACKUP] Message:',
        error.message
      );

      console.error(
        '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
      );

      console.error('\n');

      throw new Error(
        `Backup failed while loading ${key}: ${error.message}`
      );
    }
  }

  // ==========================================================
  // BUILD MAPS
  // ==========================================================

  console.log(
    '\n[BACKUP] Building relationship maps...'
  );

  const maps = {

    customers:
      buildIdMap(
        data.customers || []
      ),

    products:
      buildIdMap(
        data.products || []
      ),

    sales:
      buildIdMap(
        data.sales || []
      ),

    installmentPlans:
      buildIdMap(
        data.installmentPlans || []
      ),

    installments:
      buildIdMap(
        data.installments || []
      ),
  };

  // ==========================================================
  // ENRICH SALES
  // ==========================================================

  data.sales =
    enrichSales(
      data.sales || [],
      maps
    );

  maps.sales =
    buildIdMap(
      data.sales
    );

  // ==========================================================
  // ENRICH INSTALLMENT PLANS
  // ==========================================================

  data.installmentPlans =
    enrichInstallmentPlans(
      data.installmentPlans || [],
      maps
    );

  maps.installmentPlans =
    buildIdMap(
      data.installmentPlans
    );

  // ==========================================================
  // ENRICH INSTALLMENTS
  // ==========================================================

  data.installments =
    enrichInstallments(
      data.installments || [],
      maps
    );

  // ==========================================================
  // ENRICH PAYMENTS
  // ==========================================================

  data.payments =
    enrichPayments(
      data.payments || [],
      maps
    );

  // ==========================================================
  // CLEAN DATA
  // ==========================================================

  console.log(
    '[BACKUP] Cleaning data...'
  );

  const cleanedData = {};

  for (
    const [
      key,
      records,
    ] of Object.entries(
      data
    )
  ) {

    cleanedData[key] =
      (records || [])
        .map(
          (record) =>
            cleanObject(
              record
            )
        )
        .filter(
          (record) =>
            record !== undefined &&
            record !== null
        );

    console.log(
      `[BACKUP] Cleaned ${key}: ${cleanedData[key].length} records`
    );
  }

  // ==========================================================
  // CLEAN SHOP
  // ==========================================================

  const cleanedShop =
    cleanObject(
      shop
    );

  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================

  let totalRecords = 0;

  for (
    const records of Object.values(
      cleanedData
    )
  ) {
    totalRecords +=
      records.length;
  }

  console.log(
    '\n============================================================'
  );

  console.log(
    '[BACKUP] SHOP DATA LOAD COMPLETE'
  );

  console.log(
    '[BACKUP] TOTAL RECORDS:',
    totalRecords
  );

  console.log(
    '============================================================\n'
  );

  return {
    shop:
      cleanedShop,

    data:
      cleanedData,
  };
};

// ============================================================
// CREATE METADATA
// ============================================================

const createMetadata = ({
  shop,
  data,
  backupType,
  backupDate,
}) => {

  const collections = {};

  let totalDocuments = 0;

  for (
    const [
      collection,
      records,
    ] of Object.entries(
      data
    )
  ) {

    collections[
      collection
    ] = records.length;

    totalDocuments +=
      records.length;
  }

  const shopName =
    getFirstValue(
      shop,
      [
        'shopName',
        'name',
        'businessName',
      ]
    ) ||
    'My Electronics Shop';

  return {

    backupVersion:
      BACKUP_VERSION,

    backupType,

    database:
      'MongoDB',

    format:
      'Human-Readable TXT',

    createdAt:
      formatPakistanDate(
        new Date()
      ),

    backupDate,

    shopId:
      getIdString(
        shop?._id
      ),

    shopName,

    totalDocuments,

    collections,

    restoreCompatible:
      true,

    generatedBy:
      'Shop Management Backup Service',
  };
};

// ============================================================
// WRITE TEXT FILE
// ============================================================

const writeTextFile = async (
  filePath,
  content
) => {

  await fsp.writeFile(
    filePath,
    String(
      content || ''
    ),
    'utf8'
  );

  // ----------------------------------------------------------
  // VERIFY FILE
  // ----------------------------------------------------------

  const stat =
    await fsp.stat(
      filePath
    );

  if (
    !stat.isFile()
  ) {
    throw new Error(
      `Backup file was not created: ${filePath}`
    );
  }
};

// ============================================================
// READ BACKUP FILES
// ============================================================

const readBackupFiles = async (
  directory
) => {

  const entries =
    await fsp.readdir(
      directory,
      {
        withFileTypes: true,
      }
    );

  return entries
    .filter(
      (entry) =>
        entry.isFile()
    )
    .map(
      (entry) =>
        entry.name
    )
    .sort();
};

// ============================================================
// REMOVE DIRECTORY / FILE
// ============================================================

const removeDirectory = async (
  targetPath
) => {

  if (!targetPath) {
    return;
  }

  try {

    await fsp.rm(
      targetPath,
      {
        recursive: true,
        force: true,
      }
    );

  } catch (error) {

    console.warn(
      `[BACKUP] Could not remove ${targetPath}:`,
      error.message
    );

    try {

      const stat =
        await fsp.stat(
          targetPath
        );

      if (
        stat.isDirectory()
      ) {

        await fsp.rm(
          targetPath,
          {
            recursive: true,
            force: true,
          }
        );

      } else {

        await fsp.unlink(
          targetPath
        );
      }

    } catch {
      // Already removed
    }
  }
};

// ============================================================
// WRITE BACKUP CONTENT
// ============================================================

const writeBackupContent = async ({
  directory,
  shop,
  data,
  metadata,
}) => {

  await fsp.mkdir(
    directory,
    {
      recursive: true,
    }
  );

  console.log(
    '\n[BACKUP WRITE] Target directory:',
    directory
  );

  // ==========================================================
  // README
  // ==========================================================

  await writeTextFile(
    path.join(
      directory,
      'README.txt'
    ),
    createReadmeText(
      metadata
    )
  );

  // ==========================================================
  // BACKUP INFO
  // ==========================================================

  await writeTextFile(
    path.join(
      directory,
      'backup-info.txt'
    ),
    createBackupInfoText(
      metadata
    )
  );

  // ==========================================================
  // BACKUP SUMMARY
  // ==========================================================

  await writeTextFile(
    path.join(
      directory,
      'backup-summary.txt'
    ),
    createBackupSummaryText(
      metadata
    )
  );

  // ==========================================================
  // SHOP
  // ==========================================================

  await writeTextFile(
    path.join(
      directory,
      'shop.txt'
    ),
    createShopText(
      shop
    )
  );

  // ==========================================================
  // COLLECTIONS
  // ==========================================================

  for (
    const [
      collectionName,
      records,
    ] of Object.entries(
      data
    )
  ) {

    const fileName =
      `${sanitizeFileName(
        collectionName
      )}.txt`;

    const filePath =
      path.join(
        directory,
        fileName
      );

    const content =
      createCollectionText(
        collectionName,
        records
      );

    console.log(
      `[BACKUP WRITE] ${fileName}: ${records.length} records`
    );

    await writeTextFile(
      filePath,
      content
    );
  }

  // ==========================================================
  // VERIFY FILES
  // ==========================================================

  const fileNames =
    await readBackupFiles(
      directory
    );

  console.log(
    '[BACKUP WRITE] Files successfully written:',
    fileNames
  );

  if (
    !fileNames.length
  ) {
    throw new Error(
      `Backup files were not written to: ${directory}`
    );
  }

  // ==========================================================
  // VERIFY EXPECTED CORE FILES
  // ==========================================================

  const requiredFiles = [
    'README.txt',
    'backup-info.txt',
    'backup-summary.txt',
    'shop.txt',
  ];

  for (
    const requiredFile of requiredFiles
  ) {

    if (
      !fileNames.includes(
        requiredFile
      )
    ) {
      throw new Error(
        `Required backup file missing: ${requiredFile}`
      );
    }
  }

  return fileNames;
};

// ============================================================
// SAVE DAILY SNAPSHOT
// ============================================================

const saveDailySnapshot = async ({
  shop,
  data,
  metadata,
}) => {

  const {
    dailyDir,
  } =
    await ensureBackupStructure();

  const date =
    metadata.backupDate;

  if (
    !isValidBackupDate(
      date
    )
  ) {
    throw new Error(
      `Invalid backup date: ${date}`
    );
  }

  const finalDir =
    path.join(
      dailyDir,
      date
    );

  const tempDir =
    path.join(
      dailyDir,
      `.daily-tmp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
    );

  try {

    console.log(
      '[DAILY BACKUP] Temp directory:',
      tempDir
    );

    // --------------------------------------------------------
    // REMOVE OLD TEMP
    // --------------------------------------------------------

    await removeDirectory(
      tempDir
    );

    // --------------------------------------------------------
    // WRITE TEMP
    // --------------------------------------------------------

    await writeBackupContent({
      directory:
        tempDir,
      shop,
      data,
      metadata,
    });

    // --------------------------------------------------------
    // VERIFY TEMP
    // --------------------------------------------------------

    const tempFiles =
      await readBackupFiles(
        tempDir
      );

    if (
      !tempFiles.length
    ) {
      throw new Error(
        'Temporary daily backup is empty.'
      );
    }

    // --------------------------------------------------------
    // REMOVE OLD DATE
    // --------------------------------------------------------

    await removeDirectory(
      finalDir
    );

    // --------------------------------------------------------
    // RENAME TEMP TO FINAL
    // --------------------------------------------------------

    await fsp.rename(
      tempDir,
      finalDir
    );

    // --------------------------------------------------------
    // VERIFY FINAL
    // --------------------------------------------------------

    const finalFiles =
      await readBackupFiles(
        finalDir
      );

    console.log(
      '[DAILY BACKUP] Final files:',
      finalFiles
    );

    if (
      !finalFiles.length
    ) {
      throw new Error(
        `Daily backup folder is empty: ${finalDir}`
      );
    }

    console.log(
      '[DAILY BACKUP] Saved successfully:',
      finalDir
    );

    return finalDir;

  } catch (error) {

    await removeDirectory(
      tempDir
    );

    console.error(
      '[DAILY BACKUP] Save failed:',
      error
    );

    throw error;
  }
};

// ============================================================
// SAVE COMPLETE BACKUP
//
// COMPLETE-BACKUP contains only latest snapshot.
// ============================================================

const saveCompleteBackup = async ({
  shop,
  data,
  metadata,
}) => {

  const {
    backupDir,
    completeDir,
  } =
    await ensureBackupStructure();

  const tempDir =
    path.join(
      backupDir,
      `.complete-tmp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`
    );

  try {

    console.log(
      '[COMPLETE BACKUP] Temp directory:',
      tempDir
    );

    // --------------------------------------------------------
    // REMOVE TEMP
    // --------------------------------------------------------

    await removeDirectory(
      tempDir
    );

    // --------------------------------------------------------
    // WRITE TEMP
    // --------------------------------------------------------

    await writeBackupContent({
      directory:
        tempDir,
      shop,
      data,
      metadata,
    });

    // --------------------------------------------------------
    // VERIFY TEMP
    // --------------------------------------------------------

    const tempFiles =
      await readBackupFiles(
        tempDir
      );

    if (
      !tempFiles.length
    ) {
      throw new Error(
        'Temporary complete backup is empty.'
      );
    }

    // --------------------------------------------------------
    // REMOVE OLD COMPLETE
    // --------------------------------------------------------

    await removeDirectory(
      completeDir
    );

    // --------------------------------------------------------
    // RENAME
    // --------------------------------------------------------

    await fsp.rename(
      tempDir,
      completeDir
    );

    // --------------------------------------------------------
    // VERIFY FINAL
    // --------------------------------------------------------

    const finalFiles =
      await readBackupFiles(
        completeDir
      );

    if (
      !finalFiles.length
    ) {
      throw new Error(
        'Complete backup folder is empty.'
      );
    }

    console.log(
      '[COMPLETE BACKUP] Final files:',
      finalFiles
    );

    console.log(
      '[COMPLETE BACKUP] Saved successfully:',
      completeDir
    );

    return completeDir;

  } catch (error) {

    await removeDirectory(
      tempDir
    );

    console.error(
      '[COMPLETE BACKUP] Save failed:',
      error
    );

    throw error;
  }
};

// ============================================================
// CREATE ZIP BUFFER FROM DIRECTORY
//
// ZIP is created in memory.
// It is NOT stored on Desktop.
// ============================================================

const createZipBufferFromDirectory = async (
  directory,
  zipRootName
) => {

  return new Promise(
    async (
      resolve,
      reject
    ) => {

      try {

        const archive =
          archiver(
            'zip',
            {
              zlib: {
                level: 9,
              },
            }
          );

        const chunks = [];

        let settled = false;

        const fail = (
          error
        ) => {

          if (
            settled
          ) {
            return;
          }

          settled = true;

          reject(
            error
          );
        };

        archive.on(
          'data',
          (chunk) => {
            chunks.push(
              chunk
            );
          }
        );

        archive.on(
          'warning',
          (warning) => {

            if (
              warning.code ===
              'ENOENT'
            ) {
              console.warn(
                '[BACKUP ZIP WARNING]',
                warning.message
              );
              return;
            }

            fail(
              warning
            );
          }
        );

        archive.on(
          'error',
          (error) => {
            fail(
              error
            );
          }
        );

        archive.on(
          'end',
          () => {

            if (
              settled
            ) {
              return;
            }

            settled = true;

            const buffer =
              Buffer.concat(
                chunks
              );

            if (
              !buffer.length
            ) {
              reject(
                new Error(
                  'Generated backup ZIP is empty.'
                )
              );
              return;
            }

            console.log(
              '[BACKUP ZIP] ZIP size:',
              buffer.length,
              'bytes'
            );

            resolve(
              buffer
            );
          }
        );

        // ------------------------------------------------------
        // VERIFY DIRECTORY
        // ------------------------------------------------------

        const stat =
          await fsp.stat(
            directory
          );

        if (
          !stat.isDirectory()
        ) {
          throw new Error(
            `Backup directory does not exist: ${directory}`
          );
        }

        // ------------------------------------------------------
        // ADD DIRECTORY
        // ------------------------------------------------------

        archive.directory(
          directory,
          zipRootName
        );

        // ------------------------------------------------------
        // FINALIZE
        // ------------------------------------------------------

        await archive.finalize();

      } catch (error) {

        reject(
          error
        );
      }
    }
  );
};

// ============================================================
// CREATE DAILY BACKUP
// ============================================================

const createDailyBackup = async (
  shopId,
  requestedDate = null
) => {

  const backupDate =
    requestedDate ||
    getPakistanDate();

  if (
    !isValidBackupDate(
      backupDate
    )
  ) {
    throw new Error(
      'Invalid daily backup date. Expected YYYY-MM-DD.'
    );
  }

  console.log(
    '\n============================================================'
  );

  console.log(
    '[DAILY BACKUP] Creating backup'
  );

  console.log(
    '[DAILY BACKUP] Shop:',
    shopId
  );

  console.log(
    '[DAILY BACKUP] Date:',
    backupDate
  );

  console.log(
    '============================================================'
  );

  const {
    shop,
    data,
  } =
    await loadShopData(
      shopId
    );

  const metadata =
    createMetadata({
      shop,
      data,
      backupType:
        'DAILY',
      backupDate,
    });

  const savedPath =
    await saveDailySnapshot({
      shop,
      data,
      metadata,
    });

  const files =
    await readBackupFiles(
      savedPath
    );

  return {
    files,
    metadata,
    savedPath,
  };
};

// ============================================================
// CREATE COMPLETE BACKUP
// ============================================================

const createBackup = async (
  shopId
) => {

  console.log(
    '\n============================================================'
  );

  console.log(
    '[COMPLETE BACKUP] Creating backup'
  );

  console.log(
    '[COMPLETE BACKUP] Shop:',
    shopId
  );

  console.log(
    '============================================================'
  );

  const backupDate =
    getPakistanDate();

  const {
    shop,
    data,
  } =
    await loadShopData(
      shopId
    );

  const metadata =
    createMetadata({
      shop,
      data,
      backupType:
        'COMPLETE',
      backupDate,
    });

  const savedPath =
    await saveCompleteBackup({
      shop,
      data,
      metadata,
    });

  const files =
    await readBackupFiles(
      savedPath
    );

  return {
    files,
    metadata,
    savedPath,
  };
};

// ============================================================
// CREATE COMPLETE BACKUP ZIP
// ============================================================

const createCompleteBackupZip = async (
  shopId
) => {

  const result =
    await createBackup(
      shopId
    );

  const zipBuffer =
    await createZipBufferFromDirectory(
      result.savedPath,
      'COMPLETE-BACKUP'
    );

  const filename =
    `${sanitizeFileName(
      result.metadata.shopName
    )}-COMPLETE-BACKUP-${result.metadata.backupDate.replace(
      /-/g,
      ''
    )}.zip`;

  return {
    ...result,
    zipBuffer,
    filename,
  };
};

// ============================================================
// CREATE DAILY BACKUP ZIP
// ============================================================

const createDailyBackupZip = async (
  shopId,
  requestedDate = null
) => {

  const result =
    await createDailyBackup(
      shopId,
      requestedDate
    );

  const zipBuffer =
    await createZipBufferFromDirectory(
      result.savedPath,
      result.metadata.backupDate
    );

  const filename =
    `${sanitizeFileName(
      result.metadata.shopName
    )}-DAILY-BACKUP-${result.metadata.backupDate.replace(
      /-/g,
      ''
    )}.zip`;

  return {
    ...result,
    zipBuffer,
    filename,
  };
};

// ============================================================
// AUTOMATIC DAILY BACKUPS
// ============================================================

const runAutomaticDailyBackups =
  async () => {

    console.log(
      '\n============================================================'
    );

    console.log(
      '[AUTOMATIC BACKUP] Starting daily backups'
    );

    console.log(
      '============================================================'
    );

    const shops =
      await Shop.find({})
        .select(
          '_id shopName name businessName'
        )
        .lean();

    const result = {

      total:
        shops.length,

      success:
        0,

      failed:
        0,

      results: [],
    };

    for (
      const shop of shops
    ) {

      try {

        const backup =
          await createDailyBackup(
            shop._id
          );

        result.success += 1;

        result.results.push({
          shopId:
            getIdString(
              shop._id
            ),

          shopName:
            getFirstValue(
              shop,
              [
                'shopName',
                'name',
                'businessName',
              ]
            ) ||
            'Unknown Shop',

          success:
            true,

          savedPath:
            backup.savedPath,

          backupDate:
            backup.metadata
              .backupDate,

          files:
            backup.files,
        });

        console.log(
          `[AUTOMATIC BACKUP] SUCCESS: ${
            getFirstValue(
              shop,
              [
                'shopName',
                'name',
                'businessName',
              ]
            ) ||
            'Unknown Shop'
          }`
        );

      } catch (error) {

        result.failed += 1;

        result.results.push({
          shopId:
            getIdString(
              shop._id
            ),

          shopName:
            getFirstValue(
              shop,
              [
                'shopName',
                'name',
                'businessName',
              ]
            ) ||
            'Unknown Shop',

          success:
            false,

          error:
            error.message,
        });

        console.error(
          `[AUTOMATIC BACKUP] FAILED for shop ${shop._id}:`,
          error.message
        );
      }
    }

    console.log(
      '\n[AUTOMATIC BACKUP] Finished:',
      {
        total:
          result.total,
        success:
          result.success,
        failed:
          result.failed,
      }
    );

    return result;
  };

// ============================================================
// GET DIRECTORY SIZE
// ============================================================

const getDirectorySize = async (
  directory
) => {

  let total = 0;

  try {

    const entries =
      await fsp.readdir(
        directory,
        {
          withFileTypes: true,
        }
      );

    for (
      const entry of entries
    ) {

      const fullPath =
        path.join(
          directory,
          entry.name
        );

      if (
        entry.isDirectory()
      ) {

        total +=
          await getDirectorySize(
            fullPath
          );

      } else if (
        entry.isFile()
      ) {

        try {

          const stat =
            await fsp.stat(
              fullPath
            );

          total +=
            stat.size;

        } catch {
          // Ignore
        }
      }
    }

  } catch {
    // Ignore
  }

  return total;
};

// ============================================================
// GET BACKUP STORAGE INFO
// ============================================================

const getBackupStorageInfo =
  async (
    shopId
  ) => {

    const {
      backupDir,
      completeDir,
      dailyDir,
    } =
      await ensureBackupStructure();

    const shopObjId =
      toObjectId(
        shopId
      );

    if (
      !shopObjId
    ) {
      throw new Error(
        'Invalid shop ID.'
      );
    }

    const shop =
      await Shop.findById(
        shopObjId
      )
        .select(
          '_id shopName name businessName'
        )
        .lean();

    if (!shop) {
      throw new Error(
        'Shop not found.'
      );
    }

    // ========================================================
    // COMPLETE
    // ========================================================

    let completeExists =
      false;

    let completeFiles =
      [];

    let completeSize =
      0;

    try {

      const stat =
        await fsp.stat(
          completeDir
        );

      completeExists =
        stat.isDirectory();

      if (
        completeExists
      ) {

        completeFiles =
          await readBackupFiles(
            completeDir
          );

        completeSize =
          await getDirectorySize(
            completeDir
          );
      }

    } catch {
      completeExists =
        false;
    }

    // ========================================================
    // DAILY
    // ========================================================

    const dailyBackups =
      [];

    try {

      const entries =
        await fsp.readdir(
          dailyDir,
          {
            withFileTypes: true,
          }
        );

      for (
        const entry of entries
      ) {

        if (
          !entry.isDirectory()
        ) {
          continue;
        }

        if (
          entry.name.startsWith('.')
        ) {
          continue;
        }

        if (
          !isValidBackupDate(
            entry.name
          )
        ) {
          continue;
        }

        const dailyPath =
          path.join(
            dailyDir,
            entry.name
          );

        let fileCount =
          0;

        let size =
          0;

        try {

          const files =
            await readBackupFiles(
              dailyPath
            );

          fileCount =
            files.length;

          size =
            await getDirectorySize(
              dailyPath
            );

        } catch {
          // Ignore
        }

        dailyBackups.push({
          date:
            entry.name,

          path:
            dailyPath,

          fileCount,

          size,
        });
      }

    } catch {
      // Ignore
    }

    dailyBackups.sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        )
    );

    // ========================================================
    // RETURN
    // ========================================================

    return {

      backupRoot:
        backupDir,

      completeBackup: {

        exists:
          completeExists,

        path:
          completeDir,

        files:
          completeFiles,

        fileCount:
          completeFiles.length,

        size:
          completeSize,
      },

      dailyBackups: {

        path:
          dailyDir,

        dates:
          dailyBackups.map(
            (item) =>
              item.date
          ),

        items:
          dailyBackups,

        total:
          dailyBackups.length,
      },

      shop: {

        id:
          getIdString(
            shop._id
          ),

        name:
          getFirstValue(
            shop,
            [
              'shopName',
              'name',
              'businessName',
            ]
          ) ||
          'Unknown Shop',
      },
    };
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  // Main
  createBackup,
  createDailyBackup,

  // ZIP
  createCompleteBackupZip,
  createDailyBackupZip,
  createZipBufferFromDirectory,

  // Storage
  initializeBackupStorage,
  getBackupStorageInfo,

  // Automatic
  runAutomaticDailyBackups,

  // Constants
  BACKUP_MODELS,
  BACKUP_VERSION,
  getPakistanDate,
};