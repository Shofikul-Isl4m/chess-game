import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";

export function Register() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await axios.post("/api/v1/user/register", {
                name,
                email,
                password,
            });

            const token = response.data.data.token;
            localStorage.setItem("token", token);
            navigate("/game");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response) {
                setError(err.response.data.message ?? "Registration failed");
            } else {
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-emerald-950 p-6">
            <form
                onSubmit={handleSubmit}
                className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-black/20 p-8 shadow-2xl ring-1 ring-white/10"
            >
                <h1 className="text-center text-2xl font-bold tracking-wide text-stone-100">
                    Create account
                </h1>

                {error && (
                    <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                        {error}
                    </p>
                )}

                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-lg bg-zinc-900/60 px-4 py-2.5 text-stone-100 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="rounded-lg bg-zinc-900/60 px-4 py-2.5 text-stone-100 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-lg bg-zinc-900/60 px-4 py-2.5 text-stone-100 placeholder-zinc-500 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 rounded-xl bg-emerald-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-zinc-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Creating..." : "Register"}
                </button>

                <p className="text-center text-sm text-zinc-400">
                    Already have an account?{" "}
                    <Link to="/login" className="text-emerald-400 hover:underline">
                        Login
                    </Link>
                </p>
            </form>
        </div>
    );
}
