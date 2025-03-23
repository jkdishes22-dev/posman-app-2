// middleware/dbMiddleware.ts
import { getConnection } from '@backend/config/data-source';
import { NextApiRequest, NextApiResponse } from 'next';

export const dbMiddleware = (handler) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const connection = await getConnection();
      req.db = connection;
      return handler(req, res);
    } catch (error) {
      return res.status(500).json({ message: 'Database connection failed' });
    }
  };
};