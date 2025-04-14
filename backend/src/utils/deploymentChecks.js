const checkDeployment = async () => {
  try {
    // Check environment variables
    const requiredEnvVars = [
      'MONGODB_URI',
      'JWT_SECRET',
      'OPENAI_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Check database connection
    await mongoose.connection.db.admin().ping();

    return {
      status: 'ready',
      checks: {
        environment: 'passed',
        database: 'connected'
      }
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error.message
    };
  }
};

module.exports = checkDeployment; 