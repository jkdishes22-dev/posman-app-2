import { beforeAll, describe, it } from "vitest";
import stationPricelistsHandler from "../../../pages/api/stations/[stationId]/pricelists.js";
import menuCategoriesHandler from "../../../pages/api/menu/categories/index.js";
import menuItemsPricelistHandler from "../../../pages/api/menu/items/pricelist.js";
import billsHandler from "../../../pages/api/bills/index.js";
import { getCashierToken, getStorekeeperToken } from "../setup/helpers.js";
import { assert403, assertAllowed } from "./utils.js";

let cashierToken: string;
let storekeeperToken: string;

beforeAll(async () => {
  cashierToken = await getCashierToken();
  storekeeperToken = await getStorekeeperToken();
});

/**
 * Cashier must be able to reach the billing-page APIs.
 * Before migration 050 these all returned 403 for cashier,
 * leaving the pricelist, categories, and menu items blank.
 */
describe("Cashier billing permissions — cashier is allowed", () => {
  it("GET /api/stations/[stationId]/pricelists — cashier not blocked", async () => {
    await assertAllowed(
      { method: "GET", handler: stationPricelistsHandler, params: { stationId: "1" } },
      cashierToken,
    );
  });

  it("GET /api/menu/categories — cashier not blocked", async () => {
    await assertAllowed(
      { method: "GET", handler: menuCategoriesHandler },
      cashierToken,
    );
  });

  it("GET /api/menu/items/pricelist — cashier not blocked", async () => {
    await assertAllowed(
      { method: "GET", handler: menuItemsPricelistHandler },
      cashierToken,
    );
  });

  it("POST /api/bills — cashier not blocked", async () => {
    await assertAllowed(
      { method: "POST", handler: billsHandler, body: { station_id: 1, user_id: 1, total: 0, items: [] } },
      cashierToken,
    );
  });
});

describe("Cashier billing permissions — storekeeper still blocked from pricelist", () => {
  it("GET /api/stations/[stationId]/pricelists — storekeeper is blocked", async () => {
    await assert403(
      { method: "GET", handler: stationPricelistsHandler, params: { stationId: "1" } },
      storekeeperToken,
    );
  });

  it("POST /api/bills — storekeeper is blocked", async () => {
    await assert403(
      { method: "POST", handler: billsHandler, body: { station_id: 1, user_id: 1, total: 0, items: [] } },
      storekeeperToken,
    );
  });
});
