// Custom type declarations for packages without types

// For xss-clean
declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  const xss: () => RequestHandler;
  export default xss;
}

// For hpp
declare module 'hpp' {
  import { RequestHandler } from 'express';
  const hpp: () => RequestHandler;
  export default hpp;
} 