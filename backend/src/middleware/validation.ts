import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, ValidationError as ExpressValidationError } from 'express-validator';
import { ValidationError } from '../utils/errors';

export const validate = (validations: ValidationChain[] = []) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // If no validations are provided, proceed to the next middleware
        if (validations.length === 0) {
            return next();
        }
        
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        const formattedErrors = errors.array().map(err => {
            // Handle different error formats from express-validator
            return {
                field: 'path' in err ? err.path : ('param' in err ? err.param : 'unknown'),
                message: err.msg,
                value: 'value' in err ? err.value : undefined
            };
        });

        next(new ValidationError('Validation failed', formattedErrors));
    };
}; 