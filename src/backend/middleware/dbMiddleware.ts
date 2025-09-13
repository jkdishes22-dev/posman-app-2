import { getConnection } from "@backend/config/data-source";
import { NextApiRequest, NextApiResponse } from "next";
import { DataSource } from "typeorm";

declare module "next" {
  interface NextApiRequest {
    db: DataSource;
  }
}

// Global connection cache
let cachedConnection: DataSource | null = null;

export const dbMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // Use cached connection if available and initialized
      if (cachedConnection && cachedConnection.isInitialized) {
        req.db = cachedConnection;
        return handler(req, res);
      }

      // Get fresh connection and cache it
      req.db = await getConnection();
      cachedConnection = req.db;

      return handler(req, res);
    } catch (error: any) {
      console.error("Database connection error:", error);
      // Reset cached connection on error
      cachedConnection = null;
      return res
        .status(500)
        .json({ message: "Database connection failed: " + error.message });
    }
  };
};
