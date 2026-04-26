import { beforeAll, describe, it } from "vitest";
import billsHandler from "../../../pages/api/bills/index.js";
import billItemsHandler from "../../../pages/api/bills/[billId]/items.js";
import billPaymentsHandler from "../../../pages/api/bills/[billId]/payments.js";
import closeBillHandler from "../../../pages/api/bills/[billId]/close.js";
import reopenBillHandler from "../../../pages/api/bills/[billId]/reopen.js";
import resubmitBillHandler from "../../../pages/api/bills/[billId]/resubmit.js";
import bulkCloseHandler from "../../../pages/api/bills/bulk-close.js";
import bulkSubmitHandler from "../../../pages/api/bills/bulk-submit/index.js";
import submitBillHandler from "../../../pages/api/bills/submit/index.js";
import changeRequestsHandler from "../../../pages/api/bills/change-requests/index.js";
import qtyRequestsHandler from "../../../pages/api/bills/quantity-change-requests/index.js";
import qtyStatsHandler from "../../../pages/api/bills/quantity-change-requests/stats.js";
import reopenReasonsHandler from "../../../pages/api/bills/reopen-reasons.js";
import voidRequestsHandler from "../../../pages/api/bills/void-requests/index.js";
import voidStatsHandler from "../../../pages/api/bills/void-requests/stats.js";
import qtyApproveHandler from "../../../pages/api/bills/[billId]/items/[itemId]/quantity-change-approve.js";
import qtyRequestHandler from "../../../pages/api/bills/[billId]/items/[itemId]/quantity-change-request.js";
import voidApproveHandler from "../../../pages/api/bills/[billId]/items/[itemId]/void-approve.js";
import voidRequestHandler from "../../../pages/api/bills/[billId]/items/[itemId]/void-request.js";
import { getSalesToken, getStorekeeperToken, login } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let salesToken: string;
let storekeeperToken: string;
let supervisorToken: string;

beforeAll(async () => {
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
  supervisorToken = await login("e2e_supervisor_bills", "supervisor123");
});

const billCases = [
  { name: "POST /api/bills", method: "POST", handler: billsHandler, body: { station_id: 1, user_id: 1, total: 0, items: [] }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills", method: "GET", handler: billsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/[billId]/items", method: "GET", handler: billItemsHandler, params: { billId: "99999" }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/payments", method: "POST", handler: billPaymentsHandler, params: { billId: "99999" }, body: { paymentType: "cash", creditAmount: 10 }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/close", method: "POST", handler: closeBillHandler, params: { billId: "99999" }, wrong: () => salesToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/reopen", method: "POST", handler: reopenBillHandler, params: { billId: "99999" }, body: { reason: "auth test" }, wrong: () => salesToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/resubmit", method: "POST", handler: resubmitBillHandler, params: { billId: "99999" }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/bulk-close", method: "POST", handler: bulkCloseHandler, body: { billIds: [99999] }, wrong: () => salesToken, ok: () => supervisorToken },
  { name: "POST /api/bills/bulk-submit", method: "POST", handler: bulkSubmitHandler, body: { billIds: [99999] }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/submit", method: "POST", handler: submitBillHandler, body: { billId: 99999 }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/change-requests", method: "GET", handler: changeRequestsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/quantity-change-requests", method: "GET", handler: qtyRequestsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/quantity-change-requests/stats", method: "GET", handler: qtyStatsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/reopen-reasons", method: "GET", handler: reopenReasonsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/bills/void-requests", method: "GET", handler: voidRequestsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "GET /api/bills/void-requests/stats", method: "GET", handler: voidStatsHandler, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/items/[itemId]/quantity-change-approve", method: "POST", handler: qtyApproveHandler, params: { billId: "99999", itemId: "99999" }, body: { approved: true }, wrong: () => salesToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/items/[itemId]/quantity-change-request", method: "POST", handler: qtyRequestHandler, params: { billId: "99999", itemId: "99999" }, body: { requestedQuantity: 2, reason: "auth test" }, wrong: () => storekeeperToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/items/[itemId]/void-approve", method: "POST", handler: voidApproveHandler, params: { billId: "99999", itemId: "99999" }, body: { approved: true }, wrong: () => salesToken, ok: () => supervisorToken },
  { name: "POST /api/bills/[billId]/items/[itemId]/void-request", method: "POST", handler: voidRequestHandler, params: { billId: "99999", itemId: "99999" }, body: { reason: "auth test" }, wrong: () => storekeeperToken, ok: () => supervisorToken },
];

describe("Bills API auth coverage", () => {
  for (const c of billCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
