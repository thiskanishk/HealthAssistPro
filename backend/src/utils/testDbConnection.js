const mongoose = require('mongoose');
require('dotenv').config();

const testDbConnection = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log(`📍 URI: ${process.env.MONGODB_URI}`);

    await mongoose.connect(process.env.MONGODB_URI);
    
    // Test the connection
    console.log('✅ MongoDB Connected Successfully!');
    
    // Get database information
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

  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error('------------------------');
    console.error(error.message);
    
    console.log('\n🔍 Troubleshooting Steps:');
    console.log('------------------------');
    console.log('1. Verify MongoDB is running locally:');
    console.log('   → Run: mongosh');
    console.log('2. Check if the port 27017 is available:');
    console.log('   → Run: netstat -an | findstr "27017"');
    console.log('3. Verify the database name is correct in .env file');
    console.log('4. Make sure MongoDB service is started:');
    console.log('   → Windows: net start MongoDB');
    console.log('   → Linux/Mac: sudo service mongod status');

  } finally {
    // Close the connection
    await mongoose.disconnect();
    console.log('\n👋 Connection test completed');
  }
};

// Run the test
testDbConnection(); 