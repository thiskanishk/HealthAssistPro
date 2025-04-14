const ms = require('ms');

module.exports = {
  rateLimit: {
    windowMs: ms('15m'),
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => req.ip // Use IP for rate limiting
  },

  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: ms('1y') / 1000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  },

  session: {
    name: 'sessionId',
    secret: process.env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ms('4h')
    },
    rolling: true,
    resave: false,
    saveUninitialized: false
  },

  sanitize: {
    whiteList: {}, // empty = allow nothing
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  },

  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommonPasswords: true
  },

  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    saltLength: 64,
    iterations: 100000,
    minPasswordEntropy: 70
  },

  bruteForce: {
    freeRetries: 3,
    minWait: ms('5s'),
    maxWait: ms('1h'),
    lifetime: ms('1h')
  }
}; 