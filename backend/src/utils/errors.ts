export class AppError extends Error {
    constructor(
        public message: string,
        public statusCode: number,
        public code?: string,
        public errors?: any[]
    ) {
        super(message);
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, code?: string, errors?: any[]) {
        return new AppError(message, 400, code, errors);
    }

    static unauthorized(message: string = 'Unauthorized access') {
        return new AppError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message: string = 'Access forbidden') {
        return new AppError(message, 403, 'FORBIDDEN');
    }

    static notFound(message: string = 'Resource not found') {
        return new AppError(message, 404, 'NOT_FOUND');
    }

    static validation(errors: any[]) {
        return new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors);
    }

    static internal(message: string = 'Internal server error') {
        return new AppError(message, 500, 'INTERNAL_ERROR');
    }
}

export class ValidationError extends AppError {
    public readonly errors: any[];

    constructor(message: string, errors: any[]) {
        super(message, 400);
        this.errors = errors;
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Not authorized') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
} 