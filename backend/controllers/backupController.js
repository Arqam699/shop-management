const {
  createCompleteBackupZip,
  createDailyBackupZip,
  getBackupStorageInfo,
  BACKUP_MODELS,
  BACKUP_VERSION,
} = require('../services/backupService');

const Shop = require('../models/Shop');

// ============================================================
// GET SHOP ID
// ============================================================

const getShopId = (req) => {
  const rawShopId =
    req.shopId ||
    req.admin?.shopId ||
    req.user?.shopId;

  if (!rawShopId) {
    throw new Error(
      'Shop ID not found'
    );
  }

  if (
    typeof rawShopId === 'object' &&
    rawShopId._id
  ) {
    return String(
      rawShopId._id
    );
  }

  return String(
    rawShopId
  ).trim();
};

// ============================================================
// COMPLETE BACKUP DOWNLOAD
// ============================================================

exports.downloadBackup = async (
  req,
  res
) => {
  try {

    const shopId =
      getShopId(req);

    console.log(
      `[COMPLETE BACKUP API] Creating ZIP for shop: ${shopId}`
    );

    const result =
      await createCompleteBackupZip(
        shopId
      );

    if (
      !result?.zipBuffer ||
      !Buffer.isBuffer(
        result.zipBuffer
      ) ||
      result.zipBuffer.length === 0
    ) {
      throw new Error(
        'Generated complete backup ZIP is empty.'
      );
    }

    const filename =
      result.filename ||
      'COMPLETE-BACKUP.zip';

    res.status(200);

    res.setHeader(
      'Content-Type',
      'application/zip'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      'Content-Length',
      result.zipBuffer.length
    );

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'Expires',
      '0'
    );

    console.log(
      `[COMPLETE BACKUP API] Sending ZIP: ${filename} (${result.zipBuffer.length} bytes)`
    );

    return res.send(
      result.zipBuffer
    );

  } catch (error) {

    console.error(
      '[COMPLETE BACKUP API ERROR]',
      error
    );

    return res.status(
      error.message ===
      'Shop not found'
        ? 404
        : 500
    ).json({
      success: false,
      message:
        error.message ||
        'Complete backup create nahi ho saka.',
    });
  }
};

// ============================================================
// DAILY BACKUP DOWNLOAD
// ============================================================

exports.downloadDailyBackup = async (
  req,
  res
) => {
  try {

    const shopId =
      getShopId(req);

    const requestedDate =
      req.body?.date ||
      req.query?.date ||
      null;

    console.log(
      `[DAILY BACKUP API] Creating ZIP for shop: ${shopId}`
    );

    console.log(
      `[DAILY BACKUP API] Requested date: ${requestedDate || 'Pakistan today'}`
    );

    const result =
      await createDailyBackupZip(
        shopId,
        requestedDate
      );

    if (
      !result?.zipBuffer ||
      !Buffer.isBuffer(
        result.zipBuffer
      ) ||
      result.zipBuffer.length === 0
    ) {
      throw new Error(
        'Generated daily backup ZIP is empty.'
      );
    }

    const filename =
      result.filename ||
      'DAILY-BACKUP.zip';

    res.status(200);

    res.setHeader(
      'Content-Type',
      'application/zip'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      'Content-Length',
      result.zipBuffer.length
    );

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );

    res.setHeader(
      'Pragma',
      'no-cache'
    );

    res.setHeader(
      'Expires',
      '0'
    );

    console.log(
      `[DAILY BACKUP API] Sending ZIP: ${filename} (${result.zipBuffer.length} bytes)`
    );

    return res.send(
      result.zipBuffer
    );

  } catch (error) {

    console.error(
      '[DAILY BACKUP API ERROR]',
      error
    );

    return res.status(
      error.message ===
      'Shop not found'
        ? 404
        : 500
    ).json({
      success: false,
      message:
        error.message ||
        'Daily backup create nahi ho saka.',
    });
  }
};

// ============================================================
// BACKUP INFO
// ============================================================

exports.getBackupInfo = async (
  req,
  res
) => {
  try {

    const shopId =
      getShopId(req);

    const shop =
      await Shop.findById(
        shopId
      )
        .select(
          'shopName createdAt'
        )
        .lean();

    if (!shop) {
      return res.status(
        404
      ).json({
        success: false,
        message:
          'Shop not found.',
      });
    }

    const collectionStats =
      await Promise.all(
        Object.entries(
          BACKUP_MODELS
        ).map(
          async (
            [
              key,
              Model,
            ]
          ) => {

            const schemaPaths =
              Model.schema?.paths ||
              {};

            if (
              !schemaPaths.shopId
            ) {
              const count =
                await Model.countDocuments(
                  {}
                );

              return {
                name:
                  key,
                documents:
                  count,
              };
            }

            const instance =
              schemaPaths
                .shopId
                .instance;

            let count = 0;

            if (
              instance ===
                'ObjectID' ||
              instance ===
                'ObjectId'
            ) {

              count =
                await Model.countDocuments({
                  shopId:
                    shop._id,
                });

            } else if (
              instance === 'String'
            ) {

              count =
                await Model.countDocuments({
                  shopId:
                    String(
                      shop._id
                    ),
                });

            } else {

              count =
                await Model.countDocuments({
                  shopId:
                    shop._id,
                });
            }

            return {
              name:
                key,
              documents:
                count,
            };
          }
        )
      );

    const totalDocuments =
      collectionStats.reduce(
        (
          total,
          item
        ) =>
          total +
          item.documents,
        0
      );

    let storage =
      null;

    try {

      storage =
        await getBackupStorageInfo(
          shop._id
        );

    } catch (
      storageError
    ) {

      console.warn(
        '[BACKUP STORAGE INFO WARNING]',
        storageError.message
      );
    }

    return res.json({

      success:
        true,

      shop: {

        id:
          shop._id,

        name:
          shop.shopName,

        createdAt:
          shop.createdAt ||
          null,
      },

      totalDocuments,

      collections:
        collectionStats,

      backupCollections: [
        'shop',
        ...Object.keys(
          BACKUP_MODELS
        ),
      ],

      backup: {

        version:
          BACKUP_VERSION,

        format:
          'Human Readable TXT',

        container:
          'ZIP',

        type:
          'SHOP_SPECIFIC_BACKUP',

        dailySnapshot:
          true,

        completeSnapshot:
          true,

        fingerprintData:
          false,

        biometricData:
          false,
      },

      storage:
        storage
          ? {
              totalDailyBackups:
                storage
                  .dailyBackups
                  ?.total ||
                0,

              totalCompleteBackups:
                storage
                  .completeBackup
                  ?.exists
                  ? 1
                  : 0,

              dailyBackups:
                storage
                  .dailyBackups,

              completeBackups:
                storage
                  .completeBackup,
            }
          : null,
    });

  } catch (error) {

    console.error(
      '[BACKUP INFO ERROR]',
      error
    );

    return res.status(
      500
    ).json({
      success:
        false,

      message:
        error.message ||
        'Backup information load nahi ho saki.',
    });
  }
};