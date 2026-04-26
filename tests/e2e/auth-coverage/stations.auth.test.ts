import { beforeAll, describe, it } from "vitest";
import stationsHandler from "../../../pages/api/stations/index.js";
import stationStatusHandler from "../../../pages/api/stations/[stationId]/status.js";
import stationUsersHandler from "../../../pages/api/stations/[stationId]/users.js";
import stationAvailableUsersHandler from "../../../pages/api/stations/[stationId]/available-users.js";
import stationPricelistsHandler from "../../../pages/api/stations/[stationId]/pricelists.js";
import stationDefaultPricelistHandler from "../../../pages/api/stations/[stationId]/default-pricelist.js";
import { getAdminToken, getSalesToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let adminToken: string;
let salesToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
  salesToken = await getSalesToken();
});

const stationCases = [
  { name: "GET /api/stations", method: "GET", handler: stationsHandler, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "POST /api/stations", method: "POST", handler: stationsHandler, body: { name: "Auth Station" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "PATCH /api/stations/[stationId]/status", method: "PATCH", handler: stationStatusHandler, params: { stationId: "99999" }, body: { status: "active" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/stations/[stationId]/users", method: "GET", handler: stationUsersHandler, params: { stationId: "99999" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/stations/[stationId]/available-users", method: "GET", handler: stationAvailableUsersHandler, params: { stationId: "99999" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/stations/[stationId]/pricelists", method: "GET", handler: stationPricelistsHandler, params: { stationId: "99999" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "PATCH /api/stations/[stationId]/pricelists", method: "PATCH", handler: stationPricelistsHandler, params: { stationId: "99999" }, body: { pricelistId: 1 }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "DELETE /api/stations/[stationId]/pricelists", method: "DELETE", handler: stationPricelistsHandler, params: { stationId: "99999" }, body: { pricelistId: 1 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/stations/[stationId]/default-pricelist", method: "GET", handler: stationDefaultPricelistHandler, params: { stationId: "99999" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "PATCH /api/stations/[stationId]/default-pricelist", method: "PATCH", handler: stationDefaultPricelistHandler, params: { stationId: "99999" }, body: { pricelistId: 1 }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
];

describe("Stations API auth coverage", () => {
  for (const c of stationCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
