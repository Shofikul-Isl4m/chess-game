import type { WebSocket } from "ws";
import { Chess } from "chess.js";
import { prisma } from "@repo/db/client";

export class Game {

    public player1: { user: WebSocket | null, userId: string };
    public player2: { user: WebSocket | null, userId: string } | null;
    public gameId: string;
    public moveCount: number;
    public chess: Chess;

    constructor(player1: { user: WebSocket | null, userId: string }, player2: { user: WebSocket | null, userId: string }, gameId: string) {
        this.player1 = player1;
        this.player2 = player2;
        this.gameId = gameId;
        this.moveCount = 0;
        this.chess = new Chess();

        this.player1.user?.send(JSON.stringify({
            type: "init_game",
            color: "w"
        }))

        this.player2.user?.send(JSON.stringify({
            type: "init_game",
            color: "b"
        }))

    }
    async endGame(winner: string, pgn: string) {
        const game = await prisma.game.update({
            where: {
                id: this.gameId
            },
            data: {
                winner,
                pgn,
                gameStatus: "COMPLETED"

            }
        })
    }

    async makeMove(user: WebSocket, move: { from: string, to: string, promotion?: "q" }) {

        if (this.moveCount % 2 === 0 && user !== this.player1.user) {

            return;
        }
        if (this.moveCount % 2 === 1 && user !== this.player2?.user) {
            return;
        }

        try {
            this.chess.move(move)
            if (this.chess.isGameOver()) {
                if (this.chess.isCheckmate()) {
                    let winner = this.chess.turn() === "w" ? "black" : "white"
                    const payload = JSON.stringify({
                        type: "game_over",
                        payload: {
                            winner
                        }
                    })
                    this.endGame(winner, this.chess.pgn())
                    this.player1.user?.send(payload)
                    this.player2?.user?.send(payload)
                    return { isGameOver: true, winner }
                } else if (this.chess.isDraw()) {
                    const winner = "draw"
                    const payload = JSON.stringify({
                        type: "game_over",
                        payload: {
                            winner
                        }
                    })
                    this.endGame(winner, this.chess.pgn())
                    this.player1.user?.send(payload)
                    this.player2?.user?.send(payload)
                    return {
                        isGameOver: true, winner
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }


        if (user === this.player1.user) {
            this.player2?.user?.send(JSON.stringify({
                type: "move",
                payload: { move }

            }))
        }

        if (user === this.player2?.user) {
            this.player1.user?.send(JSON.stringify({
                type: "move",
                payload:
                    { move }
            }))
        }
        this.moveCount++;
        return { isGameOver: false, winner: null };

    }

}