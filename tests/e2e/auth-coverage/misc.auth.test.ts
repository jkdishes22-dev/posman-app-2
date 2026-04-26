import { beforeAll, describe, it } from "vitest";
import stationHandler from "../../../pages/api/station.js";
import inventoryActivityHandler from "../../../pages/api/inventory_activity.js";
import itemsHandler from "../../../pages/api/items.js";
import sellableItemsHandler from "../../../pages/api/items/sellable.js";
import suppliableItemsHandler from "../../../pages/api/items/suppliable.js";
import checkReferenceHandler from "../../../pages/api/payments/check-reference.js";
import systemBackupHandler from "../../../pages/api/system/backup.js";
import notificationsHandler from "../../../pages/api/notifications/index.js";
import notificationsMarkReadHandler from "../../../pages/api/notifications/mark-read.js";
import notificationsUnreadCountHandler from "../../../pages/api/notifications/unread-count.js";
import pricelistsAvailableHandler from "../../../pages/api/pricelists/available.js";
import userStationAccessValidationHandler from "../../../pages/api/validation/user-station-access.js";
import userMeHandler from "../../../pages/api/users/me.js";
import userMeStationsHandler from "../../../pages/api/users/me/stations.js";
import userMeDefaultStationHandler from "../../../pages/api/users/me/default-station.js";
import { getAdminToken, getSalesToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let adminToken: string;
let salesToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
  salesToken = await getSalesToken();
  storekeeperToken = await getStorekeeperToken();
});

const permissionCases = [
  { name: "GET /api/station", method: "GET", handler: stationHandler, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/inventory_activity", method: "GET", handler: inventoryActivityHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/items", method: "GET", handler: itemsHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/items/sellable", method: "GET", handler: sellableItemsHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/items/suppliable", method: "GET", handler: suppliableItemsHandler, wrong: () => salesToken, ok: () => storekeeperToken, forbiddenMode: "auth-gated" as const },
  { name: "POST /api/payments/check-reference", method: "POST", handler: checkReferenceHandler, body: { reference: "AUTH-REF", billId: 1 }, wrong: () => storekeeperToken, ok: () => salesToken },
  { name: "GET /api/system/backup", method: "GET", handler: systemBackupHandler, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
];

describe("Misc API permission auth coverage", () => {
  for (const c of permissionCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});

const authOnlyCases = [
  { name: "GET /api/notifications", method: "GET", handler: notificationsHandler },
  { name: "POST /api/notifications/mark-read", method: "POST", handler: notificationsMarkReadHandler, body: { id: 1 } },
  { name: "GET /api/notifications/unread-count", method: "GET", handler: notificationsUnreadCountHandler },
  { name: "GET /api/pricelists/available", method: "GET", handler: pricelistsAvailableHandler },
  { name: "GET /api/validation/user-station-access", method: "GET", handler: userStationAccessValidationHandler },
  { name: "GET /api/users/me", method: "GET", handler: userMeHandler },
  { name: "GET /api/users/me/stations", method: "GET", handler: userMeStationsHandler },
  { name: "GET /api/users/me/default-station", method: "GET", handler: userMeDefaultStationHandler },
];

describe("Misc API auth-only route coverage", () => {
  for (const c of authOnlyCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 200 for authenticated role", async () => assertAllowed(c, salesToken));
    });
  }
});
