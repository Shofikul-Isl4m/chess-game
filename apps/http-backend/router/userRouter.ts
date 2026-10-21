import { Router } from "express";
import { registerController, signInController } from "../controller/registerController";

const userRouter = Router();


userRouter.post("/register", registerController);
userRouter.post("/signin", signInController);

export default userRouter;