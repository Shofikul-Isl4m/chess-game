import type { Request, Response } from "express";
import { prisma } from "@repo/db/client"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export async function registerController(req: Request, res: Response) {
    const { name, email, password } = req.body;


    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        const user = await prisma.user.create(
            {
                data: {
                    name,
                    email,
                    password: hashedPassword
                }
            }
        )

        const token = jwt.sign({ userId: user.id }, "secret")

        res.status(201).json({
            message: "register successful",
            data: {
                token
            }
        })

    } catch (e: any) {
        if (e.code === "P2002") {
            res.status(409).json({ message: "Email already exists" });
            return;
        }
        res.status(500).json({ message: "Internal server error" });
    }
}


export async function signInController(req: Request, res: Response) {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ message: "Invalid email or password" });
            return;
        }

        const token = jwt.sign({ userId: user.id }, "secret");

        res.status(200).json({
            message: "Sign in successful",
            data: {
                token
            }
        });
    } catch (e: any) {
        res.status(500).json({ message: "Internal server error" });
    }
}