import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../../utils/utils";
import createHttpError from "http-errors";

export async function checkAdmin(req: Request, res: Response, next: NextFunction) {
    const _req = req as AuthRequest;
    const { role } = _req.user;

    try {
        if (role !== "admin") {
            const error = createHttpError(403, 'Access Denied: You do not have permission to access this resource.');
            return next(error);
        }
        next();
    } catch (err) {
        const error = createHttpError(500, 'Internal Server Error');
        next(error);
    }
}