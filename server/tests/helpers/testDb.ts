import mongoose from 'mongoose';

let isConnected = false;

/**
 * Connect to the test database
 * Uses the MONGODB_URI from test environment variables
 */
export async function connectTestDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/instagram-clone-test';

  try {
    // Suppress Mongoose logs during tests
    mongoose.set('debug', false);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });
    
    isConnected = true;
    console.log('📦 Connected to test database');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
}

/**
 * Clear all collections in the test database
 * Useful for cleaning up between tests
 */
export async function clearDatabase(): Promise<void> {
  if (!mongoose.connection.db) {
    return;
  }

  try {
    const collections = await mongoose.connection.db.collections();
    
    for (const collection of collections) {
      await collection.deleteMany({});
    }
    
    console.log('🗑️  Test database cleared');
  } catch (error) {
    console.error('❌ Failed to clear database:', error);
    throw error;
  }
}

/**
 * Disconnect and drop the test database
 */
export async function disconnectTestDB(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    isConnected = false;
    console.log('🔌 Disconnected from test database');
  } catch (error) {
    console.error('❌ Failed to disconnect from database:', error);
    throw error;
  }
}

/**
 * Check if connected to test database
 */
export function isTestDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}