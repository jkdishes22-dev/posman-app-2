import { beforeAll, describe, it } from "vitest";
import salesRevenueHandler from "../../../pages/api/reports/sales-revenue.js";
import productionStockRevenueHandler from "../../../pages/api/reports/production-stock-revenue.js";
import itemsSoldCountHandler from "../../../pages/api/reports/items-sold-count.js";
import itemsSoldCountUsersHandler from "../../../pages/api/reports/items-sold-count-users.js";
import voidedItemsHandler from "../../../pages/api/reports/voided-items.js";
import expenditureHandler from "../../../pages/api/reports/expenditure.js";
import invoicesPendingHandler from "../../../pages/api/reports/invoices-pending-bills.js";
import purchaseOrdersReportHandler from "../../../pages/api/reports/purchase-orders.js";
import pnlHandler from "../../../pages/api/reports/pnl.js";
import productionSalesReconHandler from "../../../pages/api/reports/production-sales-reconciliation.js";
import { getCashierToken, getSalesToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let cashierToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  cashierToken = await getCashierToken();
});

const reportCases = [
  { name: "GET /api/reports/sales-revenue", method: "GET", handler: salesRevenueHandler, wrong: () => salesToken, ok: () => cashierToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/reports/production-stock-revenue", method: "GET", handler: productionStockRevenueHandler, wrong: () => salesToken, ok: () => cashierToken },
  { name: "GET /api/reports/items-sold-count", method: "GET", handler: itemsSoldCountHandler, wrong: () => salesToken, ok: () => cashierToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/reports/items-sold-count-users", method: "GET", handler: itemsSoldCountUsersHandler, wrong: () => salesToken, ok: () => cashierToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/reports/voided-items", method: "GET", handler: voidedItemsHandler, wrong: () => salesToken, ok: () => cashierToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/reports/expenditure", method: "GET", handler: expenditureHandler, wrong: () => salesToken, ok: () => cashierToken },
  { name: "GET /api/reports/invoices-pending-bills", method: "GET", handler: invoicesPendingHandler, wrong: () => salesToken, ok: () => cashierToken },
  { name: "GET /api/reports/purchase-orders", method: "GET", handler: purchaseOrdersReportHandler, wrong: () => salesToken, ok: () => cashierToken },
  { name: "GET /api/reports/pnl", method: "GET", handler: pnlHandler, wrong: () => salesToken, ok: () => cashierToken },
  { name: "GET /api/reports/production-sales-reconciliation", method: "GET", handler: productionSalesReconHandler, wrong: () => salesToken, ok: () => cashierToken },
];

describe("Reports API auth coverage", () => {
  for (const c of reportCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("returns 200 for allowed role", async () => assertAllowed(c, c.ok()));
    });
  }
});
