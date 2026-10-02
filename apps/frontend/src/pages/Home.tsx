import { useNavigate } from "react-router-dom";

const PIECES = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "♝", "", "", "♞", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["♙", "♙", "♙", "♙", "♙", "♙", "♙", "♙"],
    ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"],
];

const GLYPH: Record<string, string> = {
    r: "♖", n: "♘", b: "♗", q: "♕", k: "♔",
    R: "♜", N: "♞", B: "♝", Q: "♛", K: "♚",
};

export function Home() {
    const navigate = useNavigate();
    return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6">
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            <div className="w-64 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10 sm:w-80">
                {PIECES.map((row, i) => (
                    <div key={i} className="flex">
                        {row.map((square, j) => (
                            <div
                                key={j}
                                className={`flex size-8 items-center justify-center text-lg sm:size-10 sm:text-xl ${(i + j) % 2 === 0 ? "bg-stone-200 text-zinc-900" : "bg-emerald-700 text-stone-50"}`}
                            >
                                {GLYPH[square] ?? square}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            <div className="flex flex-col items-center gap-6 text-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-wide text-stone-100 sm:text-5xl">Chess Game</h1>
                    <p className="mt-3 max-w-sm text-zinc-400">Challenge a friend to a match of chess in real time.</p>
                </div>
                <button
                    className="rounded-xl bg-emerald-600 px-10 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-95"
                    onClick={() => navigate("/game")}
                >Join</button>
            </div>
        </div>
    </div>
}
