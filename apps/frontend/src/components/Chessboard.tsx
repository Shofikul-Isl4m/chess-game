import { SQUARES } from "chess.js"


export function Chessboard({ board, onSquareClick, }: {
    board: any,
    onSquareClick: (square: string | null) => void,

}) {
    return <div className="w-fit overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20">{board.map((row, i) => {
        return <div key={i} className="flex">
            {
                row.map((square, j) => {
                    const sq = SQUARES[i * 8 + j]


                    const isLight = (i + j) % 2 === 0
                    return <div
                        key={j}
                        onClick={() => { onSquareClick(sq); console.log("clicked", sq) }
                        }


                        className={`flex size-16 items-center justify-center text-2xl font-bold uppercase sm:size-20 ${isLight ? "bg-stone-400" : "bg-emerald-800"} ${!square ? "" : square.color === "w" ? "text-white" : "text-black"}`}
                    > {square ? square.type : ""} </div>

                })
            }
        </div>
    })}</div >
}
