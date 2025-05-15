import {getConnection} from "@backend/config/data-source";
import {NextApiRequest, NextApiResponse} from "next";
import {DataSource} from "typeorm";

declare module "next" {
  interface NextApiRequest {
    db: DataSource;
  }
}

export const dbMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      req.db = await getConnection();
      return handler(req, res);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Database connection failed" + error });
    }
  };
};
