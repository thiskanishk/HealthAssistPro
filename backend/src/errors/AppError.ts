import { ErrorCode, HttpStatus } from '../types/api.types';

export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly status: HttpStatus;
    public readonly details?: unknown;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
        details?: unknown,
        isOperational = true
    ) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details;
        this.isOperational = isOperational;
        
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.BAD_REQUEST,
            HttpStatus.BAD_REQUEST,
            details
        );
    }

    static unauthorized(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.AUTHENTICATION_ERROR,
            HttpStatus.UNAUTHORIZED,
            details
        );
    }

    static forbidden(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.AUTHORIZATION_ERROR,
            HttpStatus.FORBIDDEN,
            details
        );
    }

    static notFound(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.NOT_FOUND,
            HttpStatus.NOT_FOUND,
            details
        );
    }

    static conflict(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.CONFLICT,
            HttpStatus.CONFLICT,
            details
        );
    }

    static validation(message: string, details?: unknown): AppError {
        return new AppError(
            message,
            ErrorCode.VALIDATION_ERROR,
            HttpStatus.BAD_REQUEST,
            details
        );
    }
} 