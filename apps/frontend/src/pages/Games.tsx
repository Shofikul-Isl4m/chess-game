import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Player = { name: string; rating: number };

type Game = {
    id: string;
    winner: string | null;
    gameStatus: string;
    pgn: string | null;
    createdAt: string;
    endAt: string | null;
    myColor: "white" | "black";
    me: Player;
    opponent: Player;
};

function resultLabel(game: Game): string {
    if (game.gameStatus === "IN_PROGRESS") return "In progress";
    if (game.gameStatus === "ABANDONED") return "Abandoned";
    if (game.winner === "draw") return "Draw";
    return game.winner === game.myColor ? "Win" : "Loss";
}

export function Games() {
    const navigate = useNavigate();
    const [games, setGames] = useState<Game[]>([]);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let ignore = false;

        (async () => {
            try {
                const { data } = await api.get("/game/games");
                if (!ignore) setGames(data.games);
            } catch (err) {
                console.log("error fetching games", err);
                if (!ignore) setError("Could not load games");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, []);

    return (
        <div className="flex min-h-screen flex-col items-center gap-6 bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6">
            <h1 className="text-2xl font-bold tracking-wide text-stone-100">Your games</h1>

            {loading && <p className="text-zinc-400">Loading...</p>}
            {error && <p className="text-red-400">{error}</p>}
            {!loading && !error && games.length === 0 && (
                <p className="text-zinc-400">No games yet.</p>
            )}

            <ul className="flex w-full max-w-md flex-col gap-3">
                {games.map((game) => (
                    <li
                        key={game.id}
                        className="flex items-center justify-between gap-4 rounded-xl bg-black/20 px-4 py-3 text-stone-100 ring-1 ring-white/10"
                    >
                        <div className="flex flex-col">
                            <span>
                                You played <b>{game.myColor}</b> vs {game.opponent.name} ({game.opponent.rating})
                            </span>
                            <span className="text-sm text-zinc-400">
                                {resultLabel(game)} ·{" "}
                                {new Date(game.endAt ?? game.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                        <button
                            onClick={() => navigate(`/games/${game.id}`)}
                            disabled={!game.pgn}
                            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            View Replay
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
