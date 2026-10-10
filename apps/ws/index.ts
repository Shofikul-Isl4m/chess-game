import { WebSocketServer } from 'ws';
import { GameManager } from './gameManager';
import jwt from "jsonwebtoken";

const wss = new WebSocketServer({ port: 8080 });

const gameManager = new GameManager();

wss.on('connection', function connection(ws, req) {

    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const token = url.searchParams.get("token");

    if (!token) return; const decoded = jwt.verify(token, "secret")

    if (typeof decoded === "string" || !("userId" in decoded)) return;
    gameManager.addUser(ws, decoded.userId)
    ws.send('something');
});