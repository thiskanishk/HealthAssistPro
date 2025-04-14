const mongoose = require('mongoose');
require('dotenv').config();

const testDbConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    // Remove sensitive URI logging
    console.log('📍 Attempting connection...');

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      bufferCommands: false
    });
    
    // Test the connection
    console.log('✅ MongoDB Connected Successfully!');
    
    // Get database information (only if not in production)
    if (process.env.NODE_ENV !== 'production') {
      const dbStatus = await mongoose.connection.db.stats();
      console.log('\n📊 Database Information:');
      console.log('------------------------');
      console.log(`Database Name: ${mongoose.connection.db.databaseName}`);
      console.log(`Number of Collections: ${dbStatus.collections}`);
      console.log(`Number of Documents: ${dbStatus.objects}`);
      console.log(`Storage Size: ${(dbStatus.storageSize / 1024 / 1024).toFixed(2)} MB`);

      // List all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log('\n📚 Available Collections:');
      console.log('------------------------');
      collections.forEach(collection => {
        console.log(`- ${collection.name}`);
      });
    }

  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error('------------------------');
    console.error(error.message);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n🔍 Troubleshooting Steps:');
      console.log('------------------------');
      console.log('1. Check MongoDB Atlas connection string');
      console.log('2. Verify IP whitelist in MongoDB Atlas');
      console.log('3. Check network connectivity');
      console.log('4. Verify environment variables are set in Vercel');
    }

  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\n👋 Connection test completed');
  }
};

// Only run the test if not in production
if (process.env.NODE_ENV !== 'production') {
  testDbConnection();
}

module.exports = testDbConnection; 