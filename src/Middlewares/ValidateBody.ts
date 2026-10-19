import type { Request, Response, NextFunction } from "express";
import { treeifyError, ZodType } from "zod";


export const validateBody = <T>(schema: ZodType<T>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (result.success) {
            req.body = result.data;
            return next();
        }

        res.status(400).json({
            error: "Validation failed",
            details: treeifyError(result.error)
        });
    };
};