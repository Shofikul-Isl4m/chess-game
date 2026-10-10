import { Router } from "express";
import { registerController } from "../controller/registerController";

const userRouter = Router();


userRouter.post("/register", registerController);

export default userRouter;