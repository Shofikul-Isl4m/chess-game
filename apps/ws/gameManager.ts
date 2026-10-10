
import { WebSocket } from "ws";
import { Game } from "./game";



export class GameManager {
    public games: Game[];
    public users: WebSocket[];
    public pendingUser: { user: WebSocket, userId: string } | null;



    constructor() {
        this.games = [];
        this.users = [];
        this.pendingUser = null;

    }

    addUser(user: WebSocket, userId: string) {
        this.users.push(user);
        user.on("message", (data) => {

            const message = JSON.parse(data.toString());



            if (message.type === "init_game") {

                if (this.pendingUser) {
                    const game = new Game(this.pendingUser, user);
                    this.games.push(game)
                    this.pendingUser = null;
                    console.log("game initialize")
                } else {

                    this.pendingUser = { user, userId };
                }

            }
            if (message.type === "move") {
                const game = this.games.find(game => game.player1 === user || game.player2 === user);
                if (game) game.makeMove(user, message.payload.move);

            }
        })

    }



}