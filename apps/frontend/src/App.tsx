import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Home } from "./pages/Home";
import { Game } from "./pages/Game";
import { Register } from "./pages/Register";
import { Login } from "./pages/Login";
import { Games } from "./pages/Games";
import { Replay } from "./pages/Replay";
import { RequireAuth } from "./components/RequireAuth";


function App() {

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "/game",
      element: (
        <RequireAuth>
          <Game />
        </RequireAuth>
      ),
    },
    {
      path: "/:id",
      element: (
        <RequireAuth>
          <Replay />
        </RequireAuth>
      ),
    },
    {
      path: "/register",
      element: <Register />,
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/games",
      element: (

        <Games />

      ),
    },
    {
      path: "/games/:id",
      element: (

        <Replay />

      ),
    },
  ]);


  return (
    <RouterProvider router={router} />
  )
}

export default App
