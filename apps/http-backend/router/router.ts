import { Router } from "express";
import userRouter from "./userRouter";
import gameRouter from "./gameRouter";

const router = Router();

router.use("/user", userRouter);
router.use("/game", gameRouter);

export default router;