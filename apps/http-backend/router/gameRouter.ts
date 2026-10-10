import { Router } from "express";
import { middleware } from "../middleware/middleware";

const gameRouter = Router();

gameRouter.use(middleware);
gameRouter.post("/create", createGameController);

export default gameRouter;
