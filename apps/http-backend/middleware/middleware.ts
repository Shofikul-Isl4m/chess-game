import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    const token = authorization?.split(" ")[1];

    if (!token) return;
    const decoded = jwt.verify(token, "secret");

    if (typeof decoded === "string" || !("userId" in decoded)) {
        res.status(401).json({
            message: "Invalid token"
        })
        return
    }
    req.userId = decoded.userId;


}