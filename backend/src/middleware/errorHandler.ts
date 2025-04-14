import { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode, HttpStatus } from '../types/api.types';
import { MongoError } from 'mongodb';
import mongoose, { Error as MongooseError } from 'mongoose';
import logger from '../utils/logger';
import { errorMonitoring } from '../services/monitoring';
import { ZodError } from 'zod';

const isDevelopment = process.env.NODE_ENV === 'development';

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    stack?: string;
  };
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

// Helper function to format error response
const formatErrorResponse = (
  code: ErrorCode,
  message: string,
  details?: unknown,
  stack?: string
): ErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    ...(details ? { details } : {}),
    ...(isDevelopment && stack ? { stack } : {})
  }
});

// Helper function to log errors
const logError = (err: Error, req: Request) => {
  const errorContext = {
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  logger.error('Request error:', {
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    context: errorContext
  });

  // Track error for monitoring
  errorMonitoring.trackError(err, errorContext);
};

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log all errors
  logError(err, req);

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.status).json(
      formatErrorResponse(
        err.code,
        err.message,
        err.details,
        err.stack
      )
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation error',
        err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        })),
        err.stack
      )
    );
  }

  // Handle Mongoose Validation Errors
  if (err instanceof mongoose.Error.ValidationError) {
    const validationErrors: ValidationErrorDetail[] = [];
    const validationError = err as mongoose.Error.ValidationError;
    
    for (const field in validationError.errors) {
      if (validationError.errors.hasOwnProperty(field)) {
        const error = validationError.errors[field];
        validationErrors.push({
          field: error.path,
          message: error.message
        });
      }
    }

    return res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation error',
        validationErrors,
        err.stack
      )
    );
  }

  // Handle Mongoose Cast Errors
  if (err instanceof mongoose.Error.CastError) {
    return res.status(HttpStatus.BAD_REQUEST).json(
      formatErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Invalid data format',
        {
          field: err.path,
          value: err.value,
          type: err.kind
        },
        err.stack
      )
    );
  }

  // Handle MongoDB Duplicate Key Errors
  if (err instanceof MongoError && err.code === 11000) {
    const error = err as MongoError & { keyPattern?: Record<string, unknown> };
    return res.status(HttpStatus.CONFLICT).json(
      formatErrorResponse(
        ErrorCode.CONFLICT,
        'Duplicate entry',
        error.keyPattern,
        err.stack
      )
    );
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(HttpStatus.UNAUTHORIZED).json(
      formatErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        'Invalid token',
        undefined,
        err.stack
      )
    );
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(HttpStatus.UNAUTHORIZED).json(
      formatErrorResponse(
        ErrorCode.AUTHENTICATION_ERROR,
        'Token expired',
        undefined,
        err.stack
      )
    );
  }

  // Handle all other errors
  return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
    formatErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      isDevelopment ? err.message : 'Internal server error',
      undefined,
      err.stack
    )
  );
}; 