import type { WebSocket } from "ws";
import { Chess } from "chess.js";

export class Game {

    public player1: WebSocket;
    public player2: WebSocket | null;
    public gameId: string;
    public moveCount: number;
    public chess: Chess;

    constructor(player1: WebSocket, player2: WebSocket) {
        this.player1 = player1;
        this.player2 = player2;
        this.gameId = crypto.randomUUID();
        this.moveCount = 0;
        this.chess = new Chess();

        this.player1.send(JSON.stringify({
            type: "init_game",
            color: "white"
        }))

        this.player2.send(JSON.stringify({
            type: "init_game",
            color: "black"
        }))

    }

    makeMove(user: WebSocket, move: { from: string, to: string }) {

        if (this.moveCount % 2 === 0 && user !== this.player1) {

            return;
        }
        if (this.moveCount % 2 === 1 && user !== this.player2) {
            return;
        }

        if (this.chess.isGameOver()) {
            // Send the game over message to both players
            this.player1.send(JSON.stringify({
                type: "game_over",
                payload: {
                    winner: this.chess.turn() === "w" ? "black" : "white"
                }
            }))
            this.player2?.send(JSON.stringify({
                type: "game_over",
                payload: {
                    winner: this.chess.turn() === "w" ? "black" : "white"
                }
            }))
            return;
        }

        try {
            this.chess.move(move)
            console.log
        } catch (e) {
            console.log(e);
        }


        if (user === this.player1) {
            this.player2?.send(JSON.stringify({
                type: "move",
                payload:
                    move
            }))
        }

        if (user === this.player2) {
            this.player1?.send(JSON.stringify({
                type: "move",
                payload:
                    move
            }))
        }
        this.moveCount++;

    }

}