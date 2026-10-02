import { useEffect, useState } from "react"
import { Chessboard } from "../components/Chessboard";
import { Chess, type Square } from "chess.js";

export function Game() {
    const [socket, setSocket] = useState(null);
    const [chess, setChess] = useState(new Chess());
    const [board, setBoard] = useState(chess.board());
    const [playerColor, setPlayerColor] = useState();
    const [selected, setSelected] = useState()

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080');
        ws.onopen = () => {
            console.log("connected")
            chess.board()
            setSocket(ws);
        }
        ws.onclose = () => {
            console.log("disconnected")
            setSocket(null);
        }
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            switch (message.type) {
                case "init_game": {
                    setPlayerColor(message.color)
                    setBoard(chess.board())
                    console.log("game initialize");
                    break;

                }
                case "move": {
                    console.log(message.payload.move)
                    try {

                        chess.move(message.payload.move)

                    } catch (e) {
                        console.log(e)

                    }
                    setBoard(chess.board());
                }
                case "game_over": {
                    console.log(message.payload.winner)
                }
            }
            console.log("client recive msg", event.data);
        }

        return () => {
            ws.close();
        }

    }, [])
    function tryMove(from: Square, to) {
        const legal = chess.moves({ square: from, verbose: true }).find(m => m.to === to)
        if (legal) {
            try {
                chess.move({ from, to, promotion: "q" })
                console.log("move happend")
            } catch (e) {
                console.log("invalid move")

            }
            setBoard(chess.board())
            setSelected(null);
            console.log({ from, to })
            socket.send(JSON.stringify({
                type: "move",
                payload: {
                    move: { from, to, promotion: "q" }

                }
            }))

        }
    }

    const myTurn = playerColor && chess.turn() === playerColor

    function onSquareClick(square: any | null) {


        console.log("inside onsquare click", chess.turn(), playerColor)

        if (!square || !myTurn) return;

        if (!selected) {
            console.log("from after 1st click", square);
            setSelected(square);
        }
        if (selected) {
            console.log("to after 2nd click", square);
            tryMove(selected, square);

        }





    }



    if (!socket) return <div className="flex h-screen items-center justify-center bg-zinc-900 text-lg font-medium text-zinc-400">
        Connecting...
    </div>

    return <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6">
        <h1 className="text-2xl font-bold tracking-wide text-stone-100 sm:text-3xl">Chess Game</h1>
        <div className="rounded-2xl bg-black/20 p-4 shadow-2xl ring-1 ring-white/10">
            <Chessboard board={board} onSquareClick={onSquareClick} />
        </div>
        <button
            className="rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-95"
            onClick={() => {
                socket.send(JSON.stringify({
                    type: "init_game"
                }))
            }}
        >Play Now</button>
    </div>
}