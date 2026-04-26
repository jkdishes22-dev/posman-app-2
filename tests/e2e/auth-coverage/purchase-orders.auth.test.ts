import { beforeAll, describe, it } from "vitest";
import purchaseOrdersHandler from "../../../pages/api/purchase-orders/index.js";
import purchaseOrderHandler from "../../../pages/api/purchase-orders/[id]/index.js";
import receivePurchaseOrderHandler from "../../../pages/api/purchase-orders/[id]/receive.js";
import cancelPurchaseOrderHandler from "../../../pages/api/purchase-orders/[id]/cancel.js";
import { getSalesToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
});

const poCases = [
  { name: "GET /api/purchase-orders", method: "GET", handler: purchaseOrdersHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/purchase-orders", method: "POST", handler: purchaseOrdersHandler, body: { supplier_id: 1, items: [] }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/purchase-orders/[id]", method: "GET", handler: purchaseOrderHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "PATCH /api/purchase-orders/[id]", method: "PATCH", handler: purchaseOrderHandler, params: { id: "99999" }, body: { notes: "auth test" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/purchase-orders/[id]/receive", method: "POST", handler: receivePurchaseOrderHandler, params: { id: "99999" }, body: { items: [] }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/purchase-orders/[id]/cancel", method: "POST", handler: cancelPurchaseOrderHandler, params: { id: "99999" }, body: { reason: "auth test" }, wrong: () => salesToken, ok: () => storekeeperToken },
];

describe("Purchase Orders API auth coverage", () => {
  for (const c of poCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
