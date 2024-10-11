import { createServer } from "http";

import next from "next";

import { parse } from "url";

import { config } from "dotenv";
import * as process from "process";

config();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log("App is running on port 3000");
  createServer((req: Request, res: Response) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT, () => {
    console.log(`Ready on http://localhost:${process.env.PORT}`);
  });
});
