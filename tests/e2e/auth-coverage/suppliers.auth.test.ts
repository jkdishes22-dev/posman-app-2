import { beforeAll, describe, it } from "vitest";
import suppliersHandler from "../../../pages/api/suppliers/index.js";
import supplierHandler from "../../../pages/api/suppliers/[id]/index.js";
import supplierCreditHandler from "../../../pages/api/suppliers/[id]/credit.js";
import { getSalesToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
});

const supplierCases = [
  { name: "GET /api/suppliers", method: "GET", handler: suppliersHandler, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/suppliers", method: "POST", handler: suppliersHandler, body: { name: "Auth Supplier", phone: "0700000000" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "GET /api/suppliers/[id]", method: "GET", handler: supplierHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "PATCH /api/suppliers/[id]", method: "PATCH", handler: supplierHandler, params: { id: "99999" }, body: { name: "Updated Auth Supplier" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "DELETE /api/suppliers/[id]", method: "DELETE", handler: supplierHandler, params: { id: "99999" }, wrong: () => salesToken, ok: () => storekeeperToken },
  { name: "POST /api/suppliers/[id]/credit", method: "POST", handler: supplierCreditHandler, params: { id: "99999" }, body: { amount: 50 }, wrong: () => salesToken, ok: () => storekeeperToken },
];

describe("Suppliers API auth coverage", () => {
  for (const c of supplierCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
