const { exec } = require('child_process');
const os = require('os');

const fixMongoConnection = () => {
  const platform = os.platform();
  
  console.log('🔧 Attempting to fix MongoDB connection...');

  if (platform === 'win32') {
    // Windows
    exec('net start MongoDB', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Could not start MongoDB service');
        console.log('Please install MongoDB if not installed:');
        console.log('https://www.mongodb.com/try/download/community');
      } else {
        console.log('✅ MongoDB service started successfully');
      }
    });
  } else {
    // Linux/Mac
    exec('sudo service mongod start', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Could not start MongoDB service');
        console.log('Try these commands:');
        console.log('1. sudo systemctl start mongod');
        console.log('2. sudo mongod --dbpath /var/lib/mongodb');
      } else {
        console.log('✅ MongoDB service started successfully');
      }
    });
  }
};

fixMongoConnection(); 