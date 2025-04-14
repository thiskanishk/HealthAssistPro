import { Request } from 'express';

export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500
}

export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    CONFLICT = 'CONFLICT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    BAD_REQUEST = 'BAD_REQUEST',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ApiError {
    code: ErrorCode;
    message: string;
    details?: unknown;
    stack?: string;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
    meta?: PaginationMeta;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery extends PaginationQuery {
    search?: string;
    filters?: Record<string, unknown>;
} 