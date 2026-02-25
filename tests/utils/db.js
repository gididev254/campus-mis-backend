/**
 * Database utility for testing
 * Uses MongoDB Memory Server for isolated test database
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to in-memory MongoDB
 */
exports.connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log(`Test database connected at ${uri}`);
};

/**
 * Disconnect and stop in-memory MongoDB
 */
exports.close = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();

  console.log('Test database disconnected');
};

/**
 * Clear all collections in database
 */
exports.clear = async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany();
  }
};

/**
 * Drop database (cleaner than clear for some cases)
 */
exports.drop = async () => {
  await mongoose.connection.dropDatabase();
};
