import express from "express";
import router from "./router/router"

const app = express();


app.use(express.json());

app.use("/api/v1", router);

app.listen("3000", () => { console.log("http-backend started at port : 3000",) })