
import { WebSocket } from "ws";
import { Game } from "./game";
import { prisma } from "@repo/db/client"
import { redis, redisSub } from "@repo/redis/redis"




export class GameManager {
    private graceTimers: Map<string, ReturnType<typeof setTimeout>>;
    public games: Game[];
    public users: WebSocket[];
    public pendingUser: { user: WebSocket, userId: string } | null;
    public serverId: string | null;
    public userConnections: Map<string, WebSocket>



    constructor() {
        this.games = [];
        this.users = [];
        this.pendingUser = null;
        this.graceTimers = new Map();
        this.serverId = crypto.randomUUID();
        this.userConnections = new Map()
        this.initPubSub();
    }

    key(gameId: string, userId: string) {
        return `${gameId}:${userId}`

    }

    cancelTimer(gameId: string, userId: string) {
        const key = this.key(gameId, userId)
        const timer = this.graceTimers.get(key)
        if (timer) {
            clearTimeout(timer);
            this.graceTimers.delete(key)
        }

    }

    startGraceTimer(gameId: string, userId: string, durationMs: number = 30000) {
        this.cancelTimer(gameId, userId)
        const key = this.key(gameId, userId)

        const timer = setTimeout(async () => {
            await this.onGraceExpired(gameId, userId)
        }, durationMs);
        this.graceTimers.set(key, timer)
    }

    async onGraceExpired(gameId: string, userId: string) {
        const key = this.key(gameId, userId);
        this.graceTimers.delete(key)
        const game = this.games.find((g) => g.gameId === gameId)
        if (!game) return;
        const winner = game?.player1.userId === userId ? "black" : "white";
        const result = {
            winner
        }

        const opponentSocket = game.player1.userId === userId ? game.player2.user : game.player1.user;
        if (opponentSocket) {
            // await this.endGame(game, { winner: null }, "ABANDONED");
            await this.endGame(game, result, "COMPLETED");
            opponentSocket?.send(JSON.stringify({
                type: "game_over",
                payload: {
                    winner
                }
            }))


        }
        this.games = this.games.filter((g) => g.gameId !== gameId);
        redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
            type: "grace_expired",
            winner,
            senderId: userId,
        }))


        // opponentSocket && opponentSocket?.send(JSON.stringify({
        //     type: "game_over",
        //     payload: {
        //         winner
        //     }
        // }))
        setTimeout(async () => {
            const g = await redis.get(`game:${game.gameId}`)
            if (!g) return;
            await this.endGame(game, { winner: null }, "ABANDONED");
            await redis.del(`game:${game.gameId}`);
            await redis.del(`user:active-game:${game.player1.userId}`)
            await redis.del(`user:active-game:${game.player2.userId}`)
        }, 2000);
        return;
    }

    restore(state: any) {
        const game = new Game({ user: null, userId: state.whitePlayerId }, { user: null, userId: state.blackPlayerId }, state.gameId)
        if (state.pgn) {
            game.chess.loadPgn(state.pgn);
        } else if (state.fen) {
            game.chess.load(state.fen)
        }
        game.moveCount = game.chess.history().length;
        return game;
    }
    initPubSub() {
        let gameId;
        redisSub.subscribe(`server:events:${this.serverId}`, (message) => {
            const event = JSON.parse(message);
            gameId = event.gameId;
            const socket = this.userConnections.get(event.reciverId)
            if (!socket) return;
            const game = new Game({ user: socket, userId: event.reciverId }, { user: null, userId: event.senderId }, event.gameId)
            socket.send(JSON.stringify({
                type: "init_game",
                color: "w",
                gameId
            }))
            this.games.push(game);
            redisSub.subscribe(`game:channel:${gameId}`, (message) => {
                const event = JSON.parse(message);
                this.crossServerHandler(event);

            })
        })


    }

    async crossServerHandler(event: any) {
        switch (event.type) {
            case "move": {
                const game = this.games.find(g => g.gameId === event.gameId)
                if (!game) return;
                if (event.fen) {
                    game.chess.load(event.fen);
                    game.moveCount = game.chess.history().length;
                }
                const opponnetSocket = game.player1.userId === event.senderId ? game.player2.user : game.player1.user;
                if (opponnetSocket) {
                    opponnetSocket.send(JSON.stringify({
                        type: "move",
                        payload: {
                            move: event.move
                        }
                    }))
                }
                break;
            }
            case "game_over": {
                const game = this.games.find(g => g.gameId === event.gameId)
                if (!game) return;
                await redis.del(`game:${game.gameId}`);
                await redis.del(`user:active-game:${game.player1.userId}`)
                await redis.del(`user:active-game:${game.player2.userId}`)
                this.games = this.games.filter((g) => g.gameId !== game.gameId)
                const socket = this.userConnections.get(event.reciverId);
                socket?.send(JSON.stringify({
                    type: "game_over",
                    payload: {
                        winner: event.winner
                    }
                }))
                break;
            }
            case "disconnected": {
                const socket = this.userConnections.get(event.recieverId);
                socket?.send(JSON.stringify({
                    type: "disconnected"


                }))

                break;
            }
            case "player_reconnected": {
                this.cancelTimer(event.gameId, event.userId);
                const socket = this.userConnections.get(event.opponentId);
                socket?.send(JSON.stringify({
                    type: "opponent_reconnect"
                }))
                break;
            }
            case "grace_expired": {
                const socket = this.userConnections.get(event.recieverId);
                const game = this.games.find((g) => g.gameId === event.gameId)

                if (socket && game) {
                    await this.endGame(game, { winner: null }, "ABANDONED");
                    socket!.send(JSON.stringify(JSON.stringify({
                        type: "game_over",
                        payload: {
                            winner: event.winner
                        }
                    })))
                    await redis.del(`game:${game.gameId}`);
                    await redis.del(`user:active-game:${game.player1.userId}`)
                    await redis.del(`user:active-game:${game.player2.userId}`)

                }




            }
        }
    }

    async recoverGames() {
        const keys = await redis.keys(`game:*`);
        if (keys.length === 0) return;
        for (const element of keys) {
            const raw = await redis.get(element)
            if (!raw) continue;
            try {
                const state = JSON.parse((raw))
                const game = this.restore(state);
                this.games.push(game);
                this.startGraceTimer(game.gameId, game.player1.userId, 90000);
                this.startGraceTimer(game.gameId, game.player2.userId, 90000);
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

    async endGame(game: any, result: any, status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED") {
        try {
            const g = await prisma.game.update({
                where: { id: game.gameId },
                data: {
                    gameStatus: status,
                    endAt: new Date(),
                    pgn: game.chess.pgn(),
                    winner: result.winner
                }

            })
            return g;

        } catch (error) {

        }

    }



    addUser(user: WebSocket, userId: string) {
        this.users.push(user);
        this.userConnections.set(userId, user)

        user.on("message", async (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === "init_game") {
                const activeGameId = await redis.get(`user:active-game:${userId}`)
                let game;
                if (activeGameId) {
                    redisSub.subscribe(`game:channel:${activeGameId}`, (message) => {
                        const event = JSON.parse(message);
                        this.crossServerHandler(event);
                    })
                    game = this.games.find((game) => game.gameId === activeGameId)
                    if (!game) {
                        const stateStr = await redis.get(`game:${activeGameId}`)
                        const state = JSON.parse(stateStr!)
                        const whitePlayer = state.whitePlayerId === userId
                        if (whitePlayer) {
                            game = new Game({ user, userId }, { user: null, userId: state.blackPlayerId }, activeGameId)
                            if (state.pgn) {
                                game.chess.loadPgn(state.pgn);
                            } else if (state.fen) {
                                game.chess.load(state.fen)
                            }
                            game.moveCount = game.chess.history().length;
                            user.send(JSON.stringify({
                                type: "me_reconnect",
                                payload: {
                                    fen: game.chess.fen(),
                                    color: game.player1.userId === userId ? "w" : "b"
                                }
                            }))
                            redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
                                type: "player_reconnected", gameId: game.gameId, userId, opponentId: game.player2.userId
                            }))

                        } else {
                            game = new Game({ user: null, userId: state.whitePlayerId }, { user, userId }, activeGameId)
                            if (state.pgn) {
                                game.chess.loadPgn(state.pgn);
                            } else if (state.fen) {
                                game.chess.load(state.fen)
                            }
                            game.moveCount = game.chess.history().length;
                            user.send(JSON.stringify({
                                type: "me_reconnect",
                                payload: {
                                    fen: game.chess.fen(),
                                    color: game.player1.userId === userId ? "w" : "b"
                                }
                            }))
                            redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
                                type: "player_reconnected", gameId: game.gameId, userId, opponentId: game.player1.userId
                            }))
                        }
                        this.games.push(game);
                        return;
                    }
                    else {
                        const opponentId = game.player1.userId === userId ? game.player2.userId : game.player1.userId;
                        if (game.player1.userId === userId) {
                            game.player1.user = user;
                        }
                        if (game.player2?.userId === userId) {
                            game.player2.user = user;
                        }
                        redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
                            type: "player_reconnected", gameId: game.gameId, userId, opponentId
                        }))

                        // socket && socket.send(JSON.stringify({
                        //     type: "opponent_reconnect",
                        //     payload: {
                        //         message: "Opponect Reconnect"
                        //     }
                        // }))
                        this.cancelTimer(game.gameId, userId)
                        user.send(JSON.stringify({
                            type: "me_reconnect",
                            payload: {
                                fen: game.chess.fen(),
                                color: game.player1.userId === userId ? "w" : "b"
                            }
                        }))
                    }

                    return;
                }

                const opponentData = await redis.rPop("matchmaking_queue");
                if (opponentData) {
                    const parseData = JSON.parse(opponentData)
                    const gameId = await this.createGame(parseData.userId, userId)
                    let game;
                    if (parseData.serverId === this.serverId) {
                        const socket = this.userConnections.get(parseData.userId)
                        game = new Game({ user: socket!, userId: parseData.userId }, { user, userId }, gameId);
                        redis.publish(`server:events:${parseData.serverId}`, JSON.stringify({
                            gameId,
                            senderId: userId,
                            reciverId: parseData.userId
                        }))
                        redisSub.subscribe(`game:channel:${gameId}`, (message) => {
                            const event = JSON.parse(message);
                            this.crossServerHandler(event);
                        })
                        user.send(JSON.stringify({
                            type: "init_game",
                            color: "b",
                            gameId
                        }))
                    } else {
                        game = new Game({ user: null, userId: parseData.userId }, { user, userId }, gameId);
                        redis.publish(`server:events:${parseData.serverId}`, JSON.stringify({
                            gameId,
                            senderId: userId,
                            reciverId: parseData.userId
                        }))
                        redisSub.subscribe(`game:channel:${gameId}`, (message) => {
                            const event = JSON.parse(message);
                            this.crossServerHandler(event);
                        })
                        user.send(JSON.stringify({
                            type: "init_game",
                            color: "b",
                            gameId
                        }))
                    }



                    await redis.set(`user:active-game:${parseData.userId}`, gameId)
                    await redis.set(`user:active-game:${userId}`, gameId)
                    await redis.set(`game:${gameId}`, JSON.stringify({
                        gameId: game.gameId, whitePlayerId: game.player1.userId, blackPlayerId: game.player2?.userId,
                        pgn: game.chess.pgn(), fen: game.chess.fen(), moveCount: game.moveCount
                    }))
                    this.games.push(game)
                    // this.pendingUser = null;
                    console.log("game initialize")
                } else {
                    await redis.lPush("matchmaking_queue", JSON.stringify({
                        serverId: this.serverId, userId
                    }))

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
                        await redis.del(`game:${game.gameId}`);
                        await redis.del(`user:active-game:${game.player1.userId}`)
                        await redis.del(`user:active-game:${game.player2.userId}`)
                        this.games = this.games.filter((g) => g.gameId !== game.gameId)
                    }
                }

            }
        });

        user.on("close", () => {
            const game = this.games.find(game => game.player1.userId === userId || game.player2?.userId === userId);
            this.userConnections.delete(userId);
            game && this.startGraceTimer(game.gameId, userId);
            if (game && game.player1.userId === userId) {
                game.player1.user = null;
                redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
                    type: "disconnected",
                    senderId: userId,
                    recieverId: game.player2.userId
                }))

                // game.player2?.user?.send(JSON.stringify({
                //     type: "disconnected",
                //     payload: {

                //     }
                // }))
            } else if (game && game.player2.userId === userId) {
                game.player2.user = null;
                redis.publish(`game:channel:${game.gameId}`, JSON.stringify({
                    type: "disconnected",
                    senderId: userId,
                    recieverId: game.player1.userId
                }))

                // game.player1.user?.send(JSON.stringify({
                //     type: "disconnected",
                //     payload: {

                //     }
                // }))
            }

        })

    }
}