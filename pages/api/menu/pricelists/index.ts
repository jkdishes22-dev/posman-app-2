import { authMiddleware, authorize } from "@backend/middleware/auth";
import permissions from "@backend/config/permissions";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createPricelistHandler,
  fetchPricelistsHandler,
} from "@controllers/PricelistController";
import { withMiddleware } from "@backend/middleware/middleware-util";
import { dbMiddleware } from "@backend/middleware/dbMiddleware";
import { cache } from "@backend/utils/cache";

const PRICELISTS_CACHE_KEY = "api_pricelists_all";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    return authorize([permissions.CAN_VIEW_PRICELIST])(async (req, res) => {
      const cached = cache.get<any>(PRICELISTS_CACHE_KEY);
      if (cached !== null) {
        return res.status(200).json(cached);
      }

      const origJson = res.json;
      res.json = function (data: any) {
        if (res.statusCode === 200) {
          cache.set(PRICELISTS_CACHE_KEY, data);
        }
        return origJson.call(this, data);
      };

      return fetchPricelistsHandler(req, res);
    })(req, res);
  } else if (req.method === "POST") {
    cache.invalidate(PRICELISTS_CACHE_KEY);
    return authorize([permissions.CAN_ADD_PRICELIST])(createPricelistHandler)(req, res);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

export default withMiddleware(dbMiddleware, authMiddleware)(handler);