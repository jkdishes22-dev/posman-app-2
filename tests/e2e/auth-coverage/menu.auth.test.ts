import { beforeAll, describe, it } from "vitest";
import categoriesHandler from "../../../pages/api/menu/categories/index.js";
import categoryHandler from "../../../pages/api/menu/categories/[id].js";
import itemsHandler from "../../../pages/api/menu/items/index.js";
import itemHandler from "../../../pages/api/menu/items/[id].js";
import itemAuditHandler from "../../../pages/api/menu/items/[id]/audit.js";
import itemStationHandler from "../../../pages/api/menu/items/station.js";
import itemPricelistHandler from "../../../pages/api/menu/items/pricelist.js";
import itemGroupsHandler from "../../../pages/api/menu/items/groups/index.js";
import itemGroupHandler from "../../../pages/api/menu/items/groups/[groupId]/index.js";
import itemGroupSubItemsHandler from "../../../pages/api/menu/items/groups/[groupId]/subitems.js";
import itemGroupItemHandler from "../../../pages/api/menu/items/groups/[groupId]/items/[itemId]/index.js";
import pricelistsHandler from "../../../pages/api/menu/pricelists/index.js";
import pricelistStatusHandler from "../../../pages/api/menu/pricelists/[pricelistId]/status.js";
import pricelistAuditHandler from "../../../pages/api/menu/pricelists/[pricelistId]/audit.js";
import pricelistItemsHandler from "../../../pages/api/menu/pricelists/[pricelistId]/items.js";
import pricelistItemHandler from "../../../pages/api/menu/pricelists/[pricelistId]/items/[itemId].js";
import pricelistItemAuditHandler from "../../../pages/api/menu/pricelists/[pricelistId]/items/[itemId]/audit.js";
import pricelistUploadHandler from "../../../pages/api/menu/pricelists/[pricelistId]/upload.js";
import pricelistUploadTemplateHandler from "../../../pages/api/menu/pricelists/[pricelistId]/upload/template.js";
import { getAdminToken, getCashierToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let adminToken: string;
let cashierToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
  cashierToken = await getCashierToken();
});

const menuCases = [
  { name: "GET /api/menu/categories", method: "GET", handler: categoriesHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/categories", method: "POST", handler: categoriesHandler, body: { name: "Auth Category", code: "AUTH_CAT", status: "active" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "DELETE /api/menu/categories/[id]", method: "DELETE", handler: categoryHandler, params: { id: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items", method: "GET", handler: itemsHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/items", method: "POST", handler: itemsHandler, body: { name: "Auth Item", code: "AUTH_ITEM" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "PATCH /api/menu/items/[id]", method: "PATCH", handler: itemHandler, params: { id: "99999" }, body: { name: "Updated Auth Item" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items/[id]/audit", method: "GET", handler: itemAuditHandler, params: { id: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items/station", method: "GET", handler: itemStationHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items/pricelist", method: "GET", handler: itemPricelistHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items/groups", method: "GET", handler: itemGroupsHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/items/groups", method: "POST", handler: itemGroupsHandler, body: { name: "Auth Group", code: "AUTH_GROUP" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/items/groups/[groupId]", method: "POST", handler: itemGroupHandler, params: { groupId: "99999" }, body: { name: "Auth Group Item" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/items/groups/[groupId]/subitems", method: "GET", handler: itemGroupSubItemsHandler, params: { groupId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "DELETE /api/menu/items/groups/[groupId]/items/[itemId]", method: "DELETE", handler: itemGroupItemHandler, params: { groupId: "99999", itemId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/pricelists", method: "GET", handler: pricelistsHandler, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/pricelists", method: "POST", handler: pricelistsHandler, body: { name: "Auth Pricelist", code: "AUTH_PL" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "PATCH /api/menu/pricelists/[pricelistId]/status", method: "PATCH", handler: pricelistStatusHandler, params: { pricelistId: "99999" }, body: { status: "active" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/pricelists/[pricelistId]/audit", method: "GET", handler: pricelistAuditHandler, params: { pricelistId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/pricelists/[pricelistId]/items", method: "GET", handler: pricelistItemsHandler, params: { pricelistId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "DELETE /api/menu/pricelists/[pricelistId]/items/[itemId]", method: "DELETE", handler: pricelistItemHandler, params: { pricelistId: "99999", itemId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/pricelists/[pricelistId]/items/[itemId]/audit", method: "GET", handler: pricelistItemAuditHandler, params: { pricelistId: "99999", itemId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "POST /api/menu/pricelists/[pricelistId]/upload", method: "POST", handler: pricelistUploadHandler, params: { pricelistId: "99999" }, body: { rows: [] }, wrong: () => cashierToken, ok: () => adminToken },
  { name: "GET /api/menu/pricelists/[pricelistId]/upload/template", method: "GET", handler: pricelistUploadTemplateHandler, params: { pricelistId: "99999" }, wrong: () => cashierToken, ok: () => adminToken },
];

describe("Menu API auth coverage", () => {
  for (const c of menuCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
