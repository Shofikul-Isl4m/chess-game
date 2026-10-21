import { Router } from "express";
import { middleware } from "../middleware/middleware";
import { fetchGameController, fetchGameByIdController } from "../controller/gameController";

const gameRouter = Router();

gameRouter.use(middleware);
gameRouter.get("/games", fetchGameController);
gameRouter.get("/:id", fetchGameByIdController);

export default gameRouter;
