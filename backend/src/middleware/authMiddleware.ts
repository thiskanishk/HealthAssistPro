// Re-export authentication middleware functions for backward compatibility
import { verifyToken, authorizeRoles } from './auth';

export = {
  verifyToken,
  authorizeRoles
}; 