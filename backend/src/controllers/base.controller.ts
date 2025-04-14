import { Request, Response } from 'express';
import { HttpStatus } from '../types/api.types';

export abstract class BaseController {
    protected sendSuccess<T>(
        res: Response,
        data: T,
        message = 'Success',
        status: HttpStatus = HttpStatus.OK
    ): Response {
        return res.status(status).json({
            success: true,
            message,
            data
        });
    }

    protected sendError(
        res: Response,
        error: Error,
        status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR
    ): Response {
        return res.status(status).json({
            success: false,
            error: {
                message: error.message,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            }
        });
    }

    protected sendCreated<T>(
        res: Response,
        data: T,
        message = 'Resource created successfully'
    ): Response {
        return this.sendSuccess(res, data, message, HttpStatus.CREATED);
    }

    protected sendNoContent(
        res: Response,
        message = 'Resource deleted successfully'
    ): Response {
        return res.status(HttpStatus.NO_CONTENT).json({
            success: true,
            message
        });
    }

    protected sendPaginated<T>(
        res: Response,
        data: T[],
        page: number,
        limit: number,
        total: number,
        message = 'Success'
    ): Response {
        const totalPages = Math.ceil(total / limit);
        
        return res.status(HttpStatus.OK).json({
            success: true,
            message,
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    }

    protected async handleAsync<T>(
        req: Request,
        res: Response,
        handler: () => Promise<T>
    ): Promise<Response> {
        try {
            const result = await handler();
            return this.sendSuccess(res, result);
        } catch (error) {
            return this.sendError(res, error as Error);
        }
    }

    protected validateId(id: string): boolean {
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    protected getPaginationParams(req: Request): { page: number; limit: number } {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
        return { page, limit };
    }

    protected getSortParams(req: Request): { sortBy: string; sortOrder: 'asc' | 'desc' } {
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as string === 'asc' ? 'asc' : 'desc');
        return { sortBy, sortOrder };
    }

    protected getSearchParams(req: Request): { search: string } {
        const search = (req.query.search as string) || '';
        return { search };
    }
} 