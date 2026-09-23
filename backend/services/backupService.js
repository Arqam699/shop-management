// ============================================================
// BACKUP SERVICE
// Human-Readable TXT Backup System
//
// LOCAL:
//   Desktop/BACKUP/
//     COMPLETE-BACKUP/
//     DAILY-BACKUPS/
//
// VERCEL:
//   No Desktop/file-system dependency for manual API backup.
//   TXT files are generated in memory and returned as ZIP.
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

const BACKUP_VERSION = '11.0.0';
const TIME_ZONE = 'Asia/Karachi';

const IS_VERCEL =
  process.env.VERCEL === '1';

// ============================================================
// LOCAL BACKUP LOCATION
// ============================================================

const BACKUP_ROOT = path.join(
  process.env.USERPROFILE || os.homedir(),
  'Desktop'
);

const BACKUP_FOLDER_NAME = 'BACKUP';
const COMPLETE_FOLDER_NAME = 'COMPLETE-BACKUP';
const DAILY_FOLDER_NAME = 'DAILY-BACKUPS';

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
// ENVIRONMENT
// ============================================================

const isVercelEnvironment = () => {
  return process.env.VERCEL === '1';
};

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
// ENSURE LOCAL BACKUP STRUCTURE
// ============================================================

const ensureBackupStructure = async () => {
  if (isVercelEnvironment()) {
    throw new Error(
      'Local Desktop backup storage is not available on Vercel.'
    );
  }

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
  if (isVercelEnvironment()) {
    console.log(
      '[BACKUP] Vercel detected. Local Desktop storage skipped.'
    );

    return {
      vercel: true,
      skipped: true,
      reason:
        'Desktop filesystem is not used on Vercel.',
    };
  }

  return ensureBackupStructure();
};

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
    return toObjectId(
      value._id
    );
  }

  const stringValue =
    String(value).trim();

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
  } catch {
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
      (char) =>
        char.toUpperCase()
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
  // EXCLUDED KEY
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
  // BUFFER
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
    value._bsontype ===
      'Decimal128'
  ) {
    return value.toString();
  }

  // ----------------------------------------------------------
  // BSON BINARY
  // ----------------------------------------------------------

  if (
    value &&
    value._bsontype ===
      'Binary'
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

    for (
      const [
        key,
        childValue,
      ] of Object.entries(value)
    ) {
      const lower =
        String(key).toLowerCase();

      // Keep _id but remove other
      // Mongo internal underscore fields.

      if (
        lower.startsWith('_') &&
        lower !== '_id'
      ) {
        continue;
      }

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
        result[key] =
          cleaned;
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
    return formatNumber(
      value
    );
  }

  if (
    typeof value === 'string' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

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
            typeof item ===
              'object' &&
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
    installments:
      'INSTALLMENTS',
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

  for (
    const key of keys
  ) {
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
// FIND BY ID
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

  text += separator('-');

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

      text += separator('-');

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
// BACKUP INFO TEXT
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

  text +=
    `Delivery: ${
      metadata.deliveryMode
    }\n`;

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

  text += separator('-');

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

  text += separator('-');

  text += '\n';

  text +=
    `TOTAL DOCUMENTS: ${formatNumber(
      metadata.totalDocuments
    )}\n`;

  return text;
};

// ============================================================
// LOAD SHOP DATA
// ============================================================

const loadShopData = async (
  shopId
) => {
  console.log('');
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
    shopId
  );

  const shopObjId =
    toObjectId(
      shopId
    );

  if (!shopObjId) {
    throw new Error(
      `Invalid shop ID for backup: ${String(
        shopId
      )}`
    );
  }

  // ==========================================================
  // SHOP
  // ==========================================================

  const shop =
    await Shop.findById(
      shopObjId
    ).lean();

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

  // ==========================================================
  // DATA
  // ==========================================================

  const data = {};

  // ==========================================================
  // LOAD COLLECTIONS
  // ==========================================================

  for (
    const [
      key,
      Model,
    ] of Object.entries(
      BACKUP_MODELS
    )
  ) {
    console.log(
      `[BACKUP] Loading: ${key}`
    );

    try {
      const schemaPaths =
        Model.schema?.paths ||
        {};

      const hasShopId =
        Boolean(
          schemaPaths.shopId
        );

      // ------------------------------------------------------
      // COLLECTION WITHOUT SHOP ID
      // ------------------------------------------------------

      if (!hasShopId) {
        console.warn(
          `[BACKUP] ${key} has no shopId. Loading global collection.`
        );

        data[key] =
          await Model.find({})
            .lean();

        continue;
      }

      const instance =
        schemaPaths.shopId.instance;

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
      // UNKNOWN TYPE
      // ------------------------------------------------------

      else {
        try {
          data[key] =
            await Model.find({
              shopId:
                shopObjId,
            }).lean();
        } catch {
          data[key] =
            await Model.find({
              shopId:
                shopObjId.toString(),
            }).lean();
        }
      }

      console.log(
        `[BACKUP] ${key}: ${
          data[key].length
        } records`
      );
    } catch (error) {
      console.error(
        `[BACKUP] Failed collection ${key}:`,
        error
      );

      throw new Error(
        `Backup failed while loading ${key}: ${error.message}`
      );
    }
  }

  // ==========================================================
  // MAPS
  // ==========================================================

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
  // ENRICH
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

  data.installmentPlans =
    enrichInstallmentPlans(
      data.installmentPlans || [],
      maps
    );

  maps.installmentPlans =
    buildIdMap(
      data.installmentPlans
    );

  data.installments =
    enrichInstallments(
      data.installments || [],
      maps
    );

  data.payments =
    enrichPayments(
      data.payments || [],
      maps
    );

  // ==========================================================
  // CLEAN
  // ==========================================================

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
      `[BACKUP] Cleaned ${key}: ${
        cleanedData[key].length
      } records`
    );
  }

  const cleanedShop =
    cleanObject(
      shop
    );

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
    `[BACKUP] TOTAL RECORDS: ${totalRecords}`
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
  deliveryMode = 'Browser ZIP Download',
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

    deliveryMode,
  };
};

// ============================================================
// BUILD ALL BACKUP TEXT FILES IN MEMORY
//
// THIS IS THE IMPORTANT VERCEL FIX.
//
// No filesystem is required here.
// ============================================================

const buildBackupTextFiles = ({
  shop,
  data,
  metadata,
}) => {
  const files = {};

  files['README.txt'] =
    createReadmeText(
      metadata
    );

  files['backup-info.txt'] =
    createBackupInfoText(
      metadata
    );

  files['backup-summary.txt'] =
    createBackupSummaryText(
      metadata
    );

  files['shop.txt'] =
    createShopText(
      shop
    );

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

    files[fileName] =
      createCollectionText(
        collectionName,
        records
      );
  }

  if (
    Object.keys(files).length === 0
  ) {
    throw new Error(
      'No backup TXT files were generated.'
    );
  }

  return files;
};

// ============================================================
// CREATE ZIP FROM IN-MEMORY TXT FILES
//
// VERCEL SAFE.
// ============================================================

const createZipBufferFromTextFiles = async (
  files,
  zipRootName
) => {
  return new Promise(
    async (
      resolve,
      reject
    ) => {
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
        if (settled) {
          return;
        }

        settled = true;

        reject(error);
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
          if (settled) {
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
            `[BACKUP ZIP] Created in memory: ${buffer.length} bytes`
          );

          resolve(
            buffer
          );
        }
      );

      try {
        const root =
          sanitizeZipPath(
            zipRootName ||
              'BACKUP'
          );

        for (
          const [
            fileName,
            content,
          ] of Object.entries(
            files
          )
        ) {
          const safeName =
            sanitizeZipPath(
              fileName
            );

          archive.append(
            Buffer.from(
              String(
                content || ''
              ),
              'utf8'
            ),
            {
              name:
                `${root}/${safeName}`,
            }
          );
        }

        await archive.finalize();
      } catch (error) {
        fail(error);
      }
    }
  );
};

// ============================================================
// SAFE ZIP PATH
// ============================================================

const sanitizeZipPath = (
  value
) => {
  return String(
    value || 'backup'
  )
    .replace(
      /\\/g,
      '/'
    )
    .split('/')
    .filter(
      (part) =>
        part &&
        part !== '.' &&
        part !== '..'
    )
    .map(
      (part) =>
        sanitizeFileName(
          part
        )
    )
    .join('/');
};

// ============================================================
// CREATE COMPLETE BACKUP ZIP DIRECTLY
//
// VERCEL + LOCAL SAFE
//
// On Vercel:
//   MongoDB -> TXT memory -> ZIP memory
//
// On local:
//   Same ZIP is generated directly.
// ============================================================

const createCompleteBackupZip = async (
  shopId
) => {
  console.log('');
  console.log(
    '============================================================'
  );
  console.log(
    '[COMPLETE BACKUP ZIP] START'
  );
  console.log(
    `[COMPLETE BACKUP ZIP] Environment: ${
      isVercelEnvironment()
        ? 'VERCEL'
        : 'LOCAL'
    }`
  );
  console.log(
    `[COMPLETE BACKUP ZIP] Shop: ${shopId}`
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

  const backupDate =
    getPakistanDate();

  const metadata =
    createMetadata({
      shop,
      data,
      backupType:
        'COMPLETE',
      backupDate,
      deliveryMode:
        'Browser ZIP Download',
    });

  const files =
    buildBackupTextFiles({
      shop,
      data,
      metadata,
    });

  const zipBuffer =
    await createZipBufferFromTextFiles(
      files,
      'COMPLETE-BACKUP'
    );

  const filename =
    `${sanitizeFileName(
      metadata.shopName
    )}-COMPLETE-BACKUP-${backupDate.replace(
      /-/g,
      ''
    )}.zip`;

  console.log(
    `[COMPLETE BACKUP ZIP] SUCCESS: ${filename}`
  );

  return {
    files:
      Object.keys(files),

    metadata,

    savedPath:
      null,

    zipBuffer,

    filename,
  };
};

// ============================================================
// CREATE DAILY BACKUP ZIP DIRECTLY
//
// IMPORTANT:
// requestedDate is only the snapshot label/date.
// Data comes from the current MongoDB database.
// ============================================================

const createDailyBackupZip = async (
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

  console.log('');
  console.log(
    '============================================================'
  );
  console.log(
    '[DAILY BACKUP ZIP] START'
  );
  console.log(
    `[DAILY BACKUP ZIP] Environment: ${
      isVercelEnvironment()
        ? 'VERCEL'
        : 'LOCAL'
    }`
  );
  console.log(
    `[DAILY BACKUP ZIP] Shop: ${shopId}`
  );
  console.log(
    `[DAILY BACKUP ZIP] Date: ${backupDate}`
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
      deliveryMode:
        'Browser ZIP Download',
    });

  const files =
    buildBackupTextFiles({
      shop,
      data,
      metadata,
    });

  const zipBuffer =
    await createZipBufferFromTextFiles(
      files,
      backupDate
    );

  const filename =
    `${sanitizeFileName(
      metadata.shopName
    )}-DAILY-BACKUP-${backupDate.replace(
      /-/g,
      ''
    )}.zip`;

  console.log(
    `[DAILY BACKUP ZIP] SUCCESS: ${filename}`
  );

  return {
    files:
      Object.keys(files),

    metadata,

    savedPath:
      null,

    zipBuffer,

    filename,
  };
};

// ============================================================
// LOCAL TXT FILE WRITE
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
// READ LOCAL BACKUP FILES
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
// REMOVE DIRECTORY
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
  } catch {
    // Ignore cleanup errors
  }
};

// ============================================================
// WRITE BACKUP CONTENT TO LOCAL DISK
//
// LOCAL ONLY.
// ============================================================

const writeBackupContent = async ({
  directory,
  shop,
  data,
  metadata,
}) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'writeBackupContent is local-only and cannot run on Vercel.'
    );
  }

  await fsp.mkdir(
    directory,
    {
      recursive: true,
    }
  );

  const files =
    buildBackupTextFiles({
      shop,
      data,
      metadata,
    });

  for (
    const [
      fileName,
      content,
    ] of Object.entries(
      files
    )
  ) {
    await writeTextFile(
      path.join(
        directory,
        fileName
      ),
      content
    );
  }

  const fileNames =
    await readBackupFiles(
      directory
    );

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
// SAVE DAILY SNAPSHOT LOCALLY
// ============================================================

const saveDailySnapshot = async ({
  shop,
  data,
  metadata,
}) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'Local daily snapshot cannot run on Vercel.'
    );
  }

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
    await removeDirectory(
      tempDir
    );

    await writeBackupContent({
      directory:
        tempDir,
      shop,
      data,
      metadata,
    });

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

    await removeDirectory(
      finalDir
    );

    await fsp.rename(
      tempDir,
      finalDir
    );

    const finalFiles =
      await readBackupFiles(
        finalDir
      );

    if (
      !finalFiles.length
    ) {
      throw new Error(
        `Daily backup folder is empty: ${finalDir}`
      );
    }

    console.log(
      '[DAILY BACKUP] Saved:',
      finalDir
    );

    return finalDir;
  } catch (error) {
    await removeDirectory(
      tempDir
    );

    throw error;
  }
};

// ============================================================
// SAVE COMPLETE BACKUP LOCALLY
// ============================================================

const saveCompleteBackup = async ({
  shop,
  data,
  metadata,
}) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'Local complete backup cannot run on Vercel.'
    );
  }

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
    await removeDirectory(
      tempDir
    );

    await writeBackupContent({
      directory:
        tempDir,
      shop,
      data,
      metadata,
    });

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

    await removeDirectory(
      completeDir
    );

    await fsp.rename(
      tempDir,
      completeDir
    );

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
      '[COMPLETE BACKUP] Saved:',
      completeDir
    );

    return completeDir;
  } catch (error) {
    await removeDirectory(
      tempDir
    );

    throw error;
  }
};

// ============================================================
// CREATE DAILY BACKUP LOCALLY
//
// Used by automatic local scheduler.
// ============================================================

const createDailyBackup = async (
  shopId,
  requestedDate = null
) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'Automatic/local daily backup cannot run on Vercel.'
    );
  }

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
      deliveryMode:
        'Local Desktop Storage',
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
// CREATE COMPLETE BACKUP LOCALLY
// ============================================================

const createBackup = async (
  shopId
) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'Local complete backup cannot run on Vercel.'
    );
  }

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
      deliveryMode:
        'Local Desktop Storage',
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
// ZIP DIRECTORY
//
// Kept for local compatibility.
// ============================================================

const createZipBufferFromDirectory = async (
  directory,
  zipRootName
) => {
  if (
    isVercelEnvironment()
  ) {
    throw new Error(
      'Directory-based ZIP is disabled on Vercel. Use in-memory TXT ZIP generation.'
    );
  }

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

          reject(error);
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
            fail(error);
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

            resolve(
              buffer
            );
          }
        );

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

        archive.directory(
          directory,
          zipRootName
        );

        await archive.finalize();
      } catch (error) {
        reject(error);
      }
    }
  );
};

// ============================================================
// AUTOMATIC DAILY BACKUPS
//
// LOCAL ONLY.
// ============================================================

const runAutomaticDailyBackups =
  async () => {
    if (
      isVercelEnvironment()
    ) {
      console.log(
        '[AUTOMATIC BACKUP] Skipped because environment is Vercel.'
      );

      return {
        total: 0,
        success: 0,
        failed: 0,
        results: [],
        skipped: true,
      };
    }

    console.log(
      '[AUTOMATIC BACKUP] Starting...'
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
          `[AUTOMATIC BACKUP] FAILED:`,
          error.message
        );
      }
    }

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
//
// IMPORTANT:
// Vercel does not have the user's Desktop backup.
// Therefore return a clean "browser storage" response.
// ============================================================

const getBackupStorageInfo =
  async (
    shopId
  ) => {
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
    // VERCEL
    // ========================================================

    if (
      isVercelEnvironment()
    ) {
      return {
        storageMode:
          'Browser Local Storage',

        vercel:
          true,

        backupRoot:
          null,

        completeBackup: {
          exists:
            false,

          path:
            null,

          files:
            [],

          fileCount:
            0,

          size:
            0,
        },

        dailyBackups: {
          path:
            null,

          dates:
            [],

          items:
            [],

          total:
            0,
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
    }

    // ========================================================
    // LOCAL
    // ========================================================

    const {
      backupDir,
      completeDir,
      dailyDir,
    } =
      await ensureBackupStructure();

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

    return {
      storageMode:
        'Local Desktop',

      vercel:
        false,

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
  // Main local backup functions
  createBackup,
  createDailyBackup,

  // Browser/API ZIP functions
  createCompleteBackupZip,
  createDailyBackupZip,

  // ZIP utility
  createZipBufferFromDirectory,
  createZipBufferFromTextFiles,

  // Storage
  initializeBackupStorage,
  getBackupStorageInfo,

  // Automatic local backup
  runAutomaticDailyBackups,

  // Constants
  BACKUP_MODELS,
  BACKUP_VERSION,

  // Utilities
  getPakistanDate,
  isVercelEnvironment,
};