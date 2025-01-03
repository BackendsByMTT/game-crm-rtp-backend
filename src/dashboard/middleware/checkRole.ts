import { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { AuthRequest } from "../../utils/utils";

export function checkRole(allowedRoles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const _req = req as AuthRequest;
        const { role } = _req.user;

        if (!allowedRoles.includes(role)) {
            return next(createHttpError(403, "Access denied. You don't have permission to access this resource."));
        }

        next();
    };
}