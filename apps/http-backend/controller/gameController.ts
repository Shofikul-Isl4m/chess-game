import { prisma } from "@repo/db/client";
import type { Request, Response } from "express";

export async function fetchGameController(req: Request, res: Response) {
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        })
        return;
    }

    try {

        const games = await prisma.game.findMany({
            where: {
                OR: [

                    { whitePlayerId: userId },
                    { blackPlayerId: userId }

                ]
            },
            include: {
                whitePlayer: {
                    select: {
                        name: true,
                        rating: true
                    }
                },
                blackPlayer: {
                    select: {
                        name: true,
                        rating: true
                    }
                }
            }

        })

        const enrichedGames = games.map((game) => {
            const isWhite = game.whitePlayerId === userId;
            return {
                ...game,
                myColor: isWhite ? "white" : "black",
                me: isWhite ? game.whitePlayer : game.blackPlayer,
                opponent: isWhite ? game.blackPlayer : game.whitePlayer,
            }
        })
        res.status(200).json({
            games: enrichedGames
        })

    } catch (error) {
        res.status(500).json({ message: "Internal server error" });

    }


}

export async function fetchGameByIdController(req: Request, res: Response) {
    const userId = req.userId;
    const gameId = req.params.id;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        })
        return;
    }

    if (typeof gameId !== "string") {
        res.status(400).json({
            message: "Invalid game id"
        })
        return;
    }

    try {
        const game = await prisma.game.findFirst({
            where: {
                id: gameId,
                OR: [
                    { whitePlayerId: userId },
                    { blackPlayerId: userId }
                ]
            },
            include: {
                whitePlayer: {
                    select: {
                        name: true,
                        rating: true
                    }
                },
                blackPlayer: {
                    select: {
                        name: true,
                        rating: true
                    }
                }
            }
        })

        if (!game) {
            res.status(404).json({ message: "Game not found" });
            return;
        }

        const isWhite = game.whitePlayerId === userId;
        res.status(200).json({
            game: {
                ...game,
                myColor: isWhite ? "white" : "black",
                me: isWhite ? game.whitePlayer : game.blackPlayer,
                opponent: isWhite ? game.blackPlayer : game.whitePlayer,
            }
        })

    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}