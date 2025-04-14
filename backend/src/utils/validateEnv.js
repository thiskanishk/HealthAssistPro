const validateEnv = () => {
  const required = [
    'PORT',
    'MONGODB_URI',
    'JWT_SECRET',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`- ${key}`));
    process.exit(1);
  }

  // Validate MongoDB URI format
  const mongoURIRegex = /^mongodb(\+srv)?:\/\/.+/;
  if (!mongoURIRegex.test(process.env.MONGODB_URI)) {
    console.error('❌ Invalid MONGODB_URI format');
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully');
};

module.exports = validateEnv; 