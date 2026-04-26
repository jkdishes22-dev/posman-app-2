import { beforeAll, describe, it } from "vitest";
import productionIndexHandler from "../../../pages/api/production/index.js";
import productionSubItemsHandler from "../../../pages/api/production/[id]/sub-items.js";
import productionSubItemHandler from "../../../pages/api/production/[id]/sub-items/[subItemId].js";
import productionIssuesHandler from "../../../pages/api/production/issues/index.js";
import productionIssueHandler from "../../../pages/api/production/issues/[id]/index.js";
import preparationsHandler from "../../../pages/api/production/preparations/index.js";
import preparationHandler from "../../../pages/api/production/preparations/[id]/index.js";
import approvePreparationHandler from "../../../pages/api/production/preparations/[id]/approve.js";
import rejectPreparationHandler from "../../../pages/api/production/preparations/[id]/reject.js";
import issueDirectlyHandler from "../../../pages/api/production/preparations/issue-directly.js";
import { getSalesToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
});

const productionCases = [
  { name: "GET /api/production", method: "GET", handler: productionIndexHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "POST /api/production", method: "POST", handler: productionIndexHandler, body: { name: "Auth Coverage Product" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/production/[id]/sub-items", method: "GET", handler: productionSubItemsHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "POST /api/production/[id]/sub-items", method: "POST", handler: productionSubItemsHandler, params: { id: "99999" }, body: { itemId: 1, quantity: 1 }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "DELETE /api/production/[id]/sub-items/[subItemId]", method: "DELETE", handler: productionSubItemHandler, params: { id: "99999", subItemId: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/production/issues", method: "GET", handler: productionIssuesHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/production/issues", method: "POST", handler: productionIssuesHandler, body: { item_id: 1, quantity: 1 }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/production/issues/[id]", method: "GET", handler: productionIssueHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/production/preparations", method: "GET", handler: preparationsHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/production/preparations", method: "POST", handler: preparationsHandler, body: { item_id: 1, quantity_prepared: 1 }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/production/preparations/[id]", method: "GET", handler: preparationHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/production/preparations/[id]/approve", method: "POST", handler: approvePreparationHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/production/preparations/[id]/reject", method: "POST", handler: rejectPreparationHandler, params: { id: "99999" }, body: { reason: "auth test" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/production/preparations/issue-directly", method: "POST", handler: issueDirectlyHandler, body: { itemId: 1, quantity: 1 }, wrong: () => salesToken, ok: () => storekeeperToken },
];

describe("Production API auth coverage", () => {
  for (const c of productionCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
