import { beforeAll, describe, it } from "vitest";
import usersHandler from "../../../pages/api/users/index.js";
import userStationsHandler from "../../../pages/api/users/[userId]/stations.js";
import notUserHandler from "../../../pages/api/users/not-user.js";
import { getAdminToken, getSalesToken } from "../setup/helpers.js";
import { assert401, assert403, assertAllowed } from "./utils.js";

let adminToken: string;
let salesToken: string;

beforeAll(async () => {
  adminToken = await getAdminToken();
  salesToken = await getSalesToken();
});

const userCases = [
  { name: "GET /api/users", method: "GET", handler: usersHandler, wrong: () => salesToken, ok: () => adminToken },
  { name: "POST /api/users", method: "POST", handler: usersHandler, body: { username: "auth-user" }, wrong: () => salesToken, ok: () => adminToken },
  { name: "DELETE /api/users", method: "DELETE", handler: usersHandler, body: { id: 99999 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "PATCH /api/users", method: "PATCH", handler: usersHandler, body: { id: 99999, status: "ACTIVE" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "GET /api/users/[userId]/stations", method: "GET", handler: userStationsHandler, params: { userId: "99999" }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "POST /api/users/[userId]/stations", method: "POST", handler: userStationsHandler, params: { userId: "99999" }, body: { station: 1 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "PATCH /api/users/[userId]/stations", method: "PATCH", handler: userStationsHandler, params: { userId: "99999" }, body: { station: 1 }, wrong: () => salesToken, ok: () => adminToken, forbiddenMode: "auth-gated" as const },
  { name: "DELETE /api/users/[userId]/stations", method: "DELETE", handler: userStationsHandler, params: { userId: "99999" }, body: { station: 1 }, wrong: () => salesToken, ok: () => adminToken },
  { name: "GET /api/users/not-user", method: "GET", handler: notUserHandler, wrong: () => salesToken, ok: () => adminToken },
];

describe("Users API auth coverage", () => {
  for (const c of userCases) {
    describe(c.name, () => {
      it("returns 401 without token", async () => assert401(c));
      it("returns 403 with wrong role token", async () => assert403(c, c.wrong()));
      it("allows role with permission", async () => assertAllowed(c, c.ok()));
    });
  }
});
