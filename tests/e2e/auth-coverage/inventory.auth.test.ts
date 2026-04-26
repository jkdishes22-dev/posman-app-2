import { beforeAll, describe, it } from "vitest";
import inventoryIndexHandler from "../../../pages/api/inventory/index.js";
import inventoryItemHandler from "../../../pages/api/inventory/[itemId]/index.js";
import inventoryAdjustHandler from "../../../pages/api/inventory/[itemId]/adjust.js";
import inventoryDisposeHandler from "../../../pages/api/inventory/[itemId]/dispose.js";
import inventoryHistoryHandler from "../../../pages/api/inventory/[itemId]/history.js";
import lowStockHandler from "../../../pages/api/inventory/low-stock.js";
import reorderSuggestionsHandler from "../../../pages/api/inventory/reorder-suggestions.js";
import inventoryStatsHandler from "../../../pages/api/inventory/stats.js";
import inventoryTransactionsHandler from "../../../pages/api/inventory/transactions.js";
import inventoryAvailableHandler from "../../../pages/api/inventory/available.js";
import { getSalesToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
});

const inventoryCases = [
  { name: "GET /api/inventory", method: "GET", handler: inventoryIndexHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/[itemId]", method: "GET", handler: inventoryItemHandler, params: { itemId: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "PATCH /api/inventory/[itemId]", method: "PATCH", handler: inventoryItemHandler, params: { itemId: "99999" }, body: { quantity: 10 }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/inventory/[itemId]/adjust", method: "POST", handler: inventoryAdjustHandler, params: { itemId: "99999" }, body: { adjustment: 1, reason: "auth test" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/inventory/[itemId]/dispose", method: "POST", handler: inventoryDisposeHandler, params: { itemId: "99999" }, body: { quantity: 1, reason: "auth test" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/[itemId]/history", method: "GET", handler: inventoryHistoryHandler, params: { itemId: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/low-stock", method: "GET", handler: lowStockHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/reorder-suggestions", method: "GET", handler: reorderSuggestionsHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/stats", method: "GET", handler: inventoryStatsHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/transactions", method: "GET", handler: inventoryTransactionsHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/inventory/available", method: "GET", handler: inventoryAvailableHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
];

describe("Inventory API auth coverage", () => {
  for (const c of inventoryCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
