
import { WebSocket } from "ws";
import { Game } from "./game";
import { prisma } from "@repo/db/client"



export class GameManager {
    public games: Game[];
    public users: WebSocket[];
    public pendingUser: { user: WebSocket, userId: string } | null;



    constructor() {
        this.games = [];
        this.users = [];
        this.pendingUser = null;

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

                if (this.pendingUser) {
                    const gameId = await this.createGame(this.pendingUser.userId, userId)
                    const game = new Game(this.pendingUser, { user, userId }, gameId);
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
                    if (result?.isGameOver) {
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
        })

    }



}