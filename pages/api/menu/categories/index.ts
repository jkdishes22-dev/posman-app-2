import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  fetchCategoriesHandler,
  createCategoryHandler,
} from "@backend/controllers/CategoryController";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { cache } from "@backend/utils/cache";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_CATEGORY])(async (req, res) => {
      const cacheKey = "api_categories_all";
      const cached = cache.get<any[]>(cacheKey);
      if (cached !== null) {
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
        res.setHeader("ETag", "\"categories\"");
        return res.status(200).json(cached);
      }

      const origJson = res.json;
      res.json = function (data: any) {
        if (res.statusCode === 200) {
          cache.set(cacheKey, data);
          res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
          res.setHeader("ETag", "\"categories\"");
        }
        return origJson.call(this, data);
      };

      return fetchCategoriesHandler(req, res);
    })(req, res);
  } else if (req.method === "POST") {
    cache.invalidate("categories");
    cache.invalidate("api_categories");
    return authorize([permissions.CAN_ADD_CATEGORY])(createCategoryHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);