// middleware/logger.ts
import { NextApiRequest, NextApiResponse } from "next";

export const loggerMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    console.log(`${req.method} ${req.url}`);
    return handler(req, res);
  };
};
