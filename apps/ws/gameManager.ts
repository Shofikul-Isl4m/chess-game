
import { WebSocket } from "ws";
import { Game } from "./game";
import { prisma } from "@repo/db/client"
import { redis } from "@repo/redis/redis"




export class GameManager {
    public games: Game[];
    public users: WebSocket[];
    public pendingUser: { user: WebSocket, userId: string } | null;



    constructor() {
        this.games = [];
        this.users = [];
        this.pendingUser = null;
    }

    restore(raw: any) {
        const game = new Game({ user: null, userId: raw.player1.userId }, { user: null, userId: raw.player2.userId }, raw.gameId)
        if (raw.pgn) {
            game.chess.loadPgn(raw.pgn);
        } else if (raw.fen) {
            game.chess.load(raw.fen)
        }

        game.moveCount = game.chess.history().length;

        return game;
    }
    async recoverGames() {
        const keys = await redis.keys(`game:*`);

        if (keys.length === 0) return;
        for (const element of keys) {
            const raw = await redis.get(element)
            if (!raw) continue;
            try {
                const game = this.restore(JSON.parse((raw)));
                this.games.push(game);
            } catch (error) {
                console.log('failed to recover game')
            }
        }
    }

    private async createGame(whitePlayerId: string, blackPlayerId: string) {
        const game = await prisma.game.create({
            data: {
                whitePlayerId,
                blackPlayerId
            }
        })

        return game.id;

    }

    addUser(user: WebSocket, userId: string) {
        this.users.push(user);
        user.on("message", async (data) => {

            const message = JSON.parse(data.toString());

            if (message.type === "init_game") {
                const activeGameId = await redis.get(`user:active-game:${userId}`)
                if (activeGameId) {
                    const game = this.games.find((game) => game.gameId === activeGameId)
                    if (game) {
                        if (game.player1.userId === userId) {
                            game.player1.user = user;
                        }
                        if (game.player2?.userId === userId) {
                            game.player2.user = user;
                        }
                        user.send(JSON.stringify({
                            type: "player_reconnect",
                            payload: {
                                fen: game.chess.fen(),
                                color: game.player1.userId === userId ? "w" : "b"
                            }
                        }))
                    }

                    return;
                }


                if (this.pendingUser) {
                    const gameId = await this.createGame(this.pendingUser.userId, userId)
                    const game = new Game(this.pendingUser, { user, userId }, gameId);
                    await redis.set(`user:active-game:${this.pendingUser.userId}`, gameId)
                    await redis.set(`user:active-game:${userId}`, gameId)
                    await redis.set(`game:${gameId}`, JSON.stringify({
                        gameId: game.gameId, whitePlayerId: game.player1.userId, blackPlayerId: game.player2?.userId,
                        pgn: game.chess.pgn(), fen: game.chess.fen(), moveCount: game.moveCount
                    }))
                    this.games.push(game)
                    this.pendingUser = null;
                    console.log("game initialize")
                } else {
                    this.pendingUser = { user, userId };

                }

            }
            if (message.type === "move") {
                const game = this.games.find(game => game.player1.userId === userId || game.player2?.userId === userId);
                if (game) {
                    const result = await game.makeMove(user, message.payload.move);
                    await redis.set(`game:${game.gameId}`, JSON.stringify({
                        gameId: game.gameId, whitePlayerId: game.player1.userId, blackPlayerId: game.player2?.userId,
                        pgn: game.chess.pgn(), fen: game.chess.fen(), moveCount: game.moveCount
                    }))
                    if (result?.isGameOver) {
                        redis.del(`game:${game.gameId}`);
                        this.games = this.games.filter((g) => g.gameId !== game.gameId)
                        await prisma.game.update({
                            where: { id: game.gameId },
                            data: {
                                gameStatus: "COMPLETED",
                                endAt: new Date(),
                                pgn: game.chess.pgn(),
                                winner: result.winner
                            }

                        })
                    }
                }

            }
        });

        user.on("close", () => {
            const game = this.games.find(game => game.player1.userId === userId || game.player2?.userId === userId);

        })

    }



}