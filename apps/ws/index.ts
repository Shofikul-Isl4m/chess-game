import { WebSocketServer } from 'ws';
import { GameManager } from './gameManager';
import jwt from "jsonwebtoken";
import { connectRedis } from '@repo/redis/redis';

const wss = new WebSocketServer({ port: 8080 });
await connectRedis();

const gameManager = new GameManager();
gameManager.recoverGames();

wss.on('connection', function connection(ws, req) {

    const url = new URL(req.url || "", `http://${req.headers.host}`);


    const token = url.searchParams.get("token");

    if (!token) {
        ws.close(1008, "Unauthorized")
        return;
    }
    let decoded;
    try {
        decoded = jwt.verify(token, "secret")
    } catch (error) {
        ws.close(1008, "Unauthorized")
        return;
    }

    if (typeof decoded === "string" || !("userId" in decoded)) return;
    gameManager.addUser(ws, decoded.userId)

});