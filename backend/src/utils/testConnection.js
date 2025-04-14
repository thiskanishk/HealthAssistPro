const mongoose = require('mongoose');
require('dotenv').config();

const testConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connection test successful');
    
    // Test database operations
    const collections = await mongoose.connection.db.collections();
    console.log('Available collections:', collections.map(c => c.collectionName));
    
    // Check database stats
    const stats = await mongoose.connection.db.stats();
    console.log('Database stats:', {
      collections: stats.collections,
      documents: stats.objects,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`
    });

  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error.message);
    console.log('\nTroubleshooting steps:');
    console.log('1. Ensure MongoDB is running locally');
    console.log('2. Check if the connection URI is correct');
    console.log('3. Verify network connectivity');
    console.log('4. Check if authentication credentials are correct (if used)');
  } finally {
    await mongoose.disconnect();
  }
};

testConnection(); 