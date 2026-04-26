import { beforeAll, describe, it } from "vitest";
import rolesHandler from "../../../pages/api/roles/index.js";
import rolePermissionsHandler from "../../../pages/api/roles/[roleId]/permissions.js";
import permissionsHandler from "../../../pages/api/roles/permissions/index.js";
import scopesHandler from "../../../pages/api/roles/scopes/index.js";
import scopePermissionsHandler from "../../../pages/api/roles/scopes/[scopeId]/permissions/index.js";
import { getAdminToken, getSalesToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let adminToken: string;
let salesToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
  salesToken = await getSalesToken();
});

const roleCases = [
  { name: "GET /api/roles", method: "GET", handler: rolesHandler, wrong: () => salesToken, ok: () => adminToken },
  { name: "POST /api/roles", method: "POST", handler: rolesHandler, body: { name: "auth-role" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/roles/[roleId]/permissions", method: "GET", handler: rolePermissionsHandler, params: { roleId: "99999" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "POST /api/roles/[roleId]/permissions", method: "POST", handler: rolePermissionsHandler, params: { roleId: "99999" }, body: { permissionId: 1 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "DELETE /api/roles/[roleId]/permissions", method: "DELETE", handler: rolePermissionsHandler, params: { roleId: "99999" }, body: { permissionId: 1 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/roles/permissions", method: "GET", handler: permissionsHandler, wrong: () => salesToken, ok: () => adminToken },
  { name: "POST /api/roles/permissions", method: "POST", handler: permissionsHandler, body: { name: "auth-perm" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/roles/scopes", method: "GET", handler: scopesHandler, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/roles/scopes/[scopeId]/permissions", method: "GET", handler: scopePermissionsHandler, params: { scopeId: "99999" }, wrong: () => salesToken, ok: () => adminToken },
];

describe("Roles API auth coverage", () => {
  for (const c of roleCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
