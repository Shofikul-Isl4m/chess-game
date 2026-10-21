import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "../components/Chessboard";
import { api } from "../lib/api";

type Player = { name: string; rating: number };

type Game = {
    id: string;
    pgn: string | null;
    winner: string | null;
    gameStatus: string;
    myColor: "white" | "black";
    me: Player;
    opponent: Player;
};

export function Replay() {
    const { id } = useParams();
    const [game, setGame] = useState<Game | null>(null);
    const [error, setError] = useState("");
    const [ply, setPly] = useState(0);

    useEffect(() => {
        let ignore = false;

        (async () => {
            try {
                const { data } = await api.get(`/game/${id}`);
                if (!ignore) setGame(data.game);
            } catch (err) {
                console.log("error fetching game", err);
                if (!ignore) setError("Could not load game");
            }
        })();

        return () => {
            ignore = true;
        };
    }, [id]);

    const moves = useMemo(() => {
        if (!game?.pgn) return [];
        try {
            const base = new Chess();
            base.loadPgn(game.pgn);
            return base.history();
        } catch {
            return [];
        }
    }, [game]);

    const board = useMemo(() => {
        const chess = new Chess();
        for (let i = 0; i < ply; i++) {
            chess.move(moves[i]);
        }
        return chess.board();
    }, [moves, ply]);

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6 text-red-400">
                {error}
            </div>
        );
    }

    if (!game) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6 text-zinc-400">
                Loading...
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6">
            <h1 className="text-xl font-bold tracking-wide text-stone-100 sm:text-2xl">
                {game.me.name} vs {game.opponent.name}
            </h1>

            <div className="rounded-2xl bg-black/20 p-4 shadow-2xl ring-1 ring-white/10">
                <Chessboard board={board} onSquareClick={() => {}} />
            </div>

            <div className="flex items-center gap-3 text-stone-100">
                <button
                    onClick={() => setPly(0)}
                    disabled={ply === 0}
                    className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/10 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    |&lt;
                </button>
                <button
                    onClick={() => setPly((p) => Math.max(0, p - 1))}
                    disabled={ply === 0}
                    className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/10 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    &lt;
                </button>
                <span className="min-w-20 text-center tabular-nums">
                    {ply} / {moves.length}
                </span>
                <button
                    onClick={() => setPly((p) => Math.min(moves.length, p + 1))}
                    disabled={ply === moves.length}
                    className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/10 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    &gt;
                </button>
                <button
                    onClick={() => setPly(moves.length)}
                    disabled={ply === moves.length}
                    className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/10 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    &gt;|
                </button>
            </div>

            {moves.length === 0 && (
                <p className="text-zinc-400">No replay available for this game.</p>
            )}
        </div>
    );
}
