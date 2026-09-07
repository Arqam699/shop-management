require('dotenv').config();

const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');

const linkStockMovementsToShop = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log('MongoDB connected');

    const movements = await StockMovement.find({
      $or: [
        { shopId: { $exists: false } },
        { shopId: null },
      ],
    });

    console.log(
      `StockMovements without shopId: ${movements.length}`
    );

    let linked = 0;
    let skipped = 0;

    for (const movement of movements) {
      const product = await Product.findById(
        movement.product
      ).select('shopId');

      if (!product || !product.shopId) {
        console.log(
          `Skipped movement ${movement._id}: Product not found or has no shopId`
        );

        skipped++;
        continue;
      }

      await StockMovement.updateOne(
        { _id: movement._id },
        {
          $set: {
            shopId: product.shopId,
          },
        }
      );

      linked++;
    }

    console.log(`Linked: ${linked}`);
    console.log(`Skipped: ${skipped}`);

    console.log(
      'StockMovement migration completed successfully.'
    );

  } catch (error) {
    console.error('Migration Error:', error);

  } finally {
    await mongoose.connection.close();

    console.log('MongoDB connection closed');
  }
};

linkStockMovementsToShop();