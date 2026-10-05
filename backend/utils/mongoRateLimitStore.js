const crypto = require('crypto');
const mongoose = require('mongoose');

// Shared fixed-window counters survive Vercel function instances and restarts.
class MongoRateLimitStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.windowMs = 15 * 60 * 1000;
    this.collection = null;
    this.indexReady = null;
  }

  init(options) {
    this.windowMs = options.windowMs;
  }

  async getCollection() {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connection.asPromise();
    }

    if (!this.collection) {
      this.collection = mongoose.connection.collection(this.collectionName);
    }

    if (!this.indexReady) {
      this.indexReady = this.collection.createIndex(
        { resetTime: 1 },
        { expireAfterSeconds: 0 }
      ).catch((error) => {
        this.indexReady = null;
        throw error;
      });
    }

    await this.indexReady;
    return this.collection;
  }

  async increment(key) {
    const collection = await this.getCollection();
    const now = new Date();
    const resetTime = new Date(now.getTime() + this.windowMs);
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const update = [
      {
        $set: {
          count: {
            $cond: [
              { $gt: ['$resetTime', now] },
              { $add: [{ $ifNull: ['$count', 0] }, 1] },
              1,
            ],
          },
          resetTime: {
            $cond: [
              { $gt: ['$resetTime', now] },
              '$resetTime',
              resetTime,
            ],
          },
        },
      },
    ];

    let record;
    try {
      record = await collection.findOneAndUpdate(
        { _id: keyHash },
        update,
        { upsert: true, returnDocument: 'after' }
      );
    } catch (error) {
      // Concurrent first requests can race to upsert the same _id.
      if (error.code !== 11000) throw error;
      record = await collection.findOneAndUpdate(
        { _id: keyHash },
        update,
        { returnDocument: 'after' }
      );
    }

    return {
      totalHits: record.count,
      resetTime: record.resetTime,
    };
  }

  async decrement(key) {
    const collection = await this.getCollection();
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    await collection.updateOne(
      { _id: keyHash, count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  }

  async resetKey(key) {
    const collection = await this.getCollection();
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    await collection.deleteOne({ _id: keyHash });
  }

  async resetAll() {
    const collection = await this.getCollection();
    await collection.deleteMany({});
  }

  async shutdown() {}
}

module.exports = MongoRateLimitStore;
