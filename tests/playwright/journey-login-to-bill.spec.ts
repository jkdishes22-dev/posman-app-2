/**
 * End-to-end journey: login as e2e_sales → create a bill.
 * One test = one continuous video when run with video: 'on'.
 *
 * Run after seeding:
 *   npx vitest run --config vitest.config.playwright-seed.ts
 *   npx playwright test tests/playwright/journey-login-to-bill.spec.ts
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

// Same fixtures as billing.spec.ts — reused if state file already exists.
const STATION_NAME = "E2E Billing Station";
const PRICELIST_NAME = "E2E Billing Pricelist";
const CATEGORY_NAME = "E2E Billing Category";
const ITEM_NAME = "E2E Billing Item";
const ITEM_CODE = "E2EBILL";
const ITEM_PRICE = 150;

const STATE_FILE = path.join(
  process.cwd(),
  ".test-db",
  "billing-test-state.json",
);

function stateExists(): boolean {
  try {
    if (!fs.existsSync(STATE_FILE)) return false;
    const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const token: string = s.token ?? "";
    if (!token) return false;
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

test.describe("Login → Billing journey", () => {
  test.beforeAll(async () => {
    // Skip if billing.spec.ts already created the fixtures in this DB cycle.
    if (stateExists()) return;

    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

    const adminRes = await ctx.post("/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    const adminToken: string = (await adminRes.json()).token;
    const auth = { Authorization: `Bearer ${adminToken}` };

    const stationRes = await ctx.post("/api/stations", {
      headers: auth,
      data: { name: STATION_NAME },
    });
    expect(stationRes.status()).toBe(201);
    const stationId: number = (await stationRes.json()).id;

    const plRes = await ctx.post("/api/menu/pricelists", {
      headers: auth,
      data: { name: PRICELIST_NAME, code: "E2E-PL" },
    });
    expect(plRes.status()).toBe(201);
    const pricelistId: number = (await plRes.json()).id;

    await ctx.post(`/api/stations/${stationId}/pricelists`, {
      headers: auth,
      data: { pricelistId },
    });
    await ctx.post(`/api/stations/${stationId}/default-pricelist`, {
      headers: auth,
      data: { pricelistId },
    });

    const catRes = await ctx.post("/api/menu/categories", {
      headers: auth,
      data: { name: CATEGORY_NAME },
    });
    expect(catRes.status()).toBe(201);
    const categoryId: number = (await catRes.json()).id;

    const itemRes = await ctx.post("/api/menu/items", {
      headers: auth,
      data: {
        name: ITEM_NAME,
        code: ITEM_CODE,
        price: ITEM_PRICE,
        category: { id: categoryId },
        pricelistId,
        isGroup: false,
        isStock: true,
        allowNegativeInventory: true,
      },
    });
    expect(itemRes.status()).toBe(201);

    const salesLoginRes = await ctx.post("/api/auth/login", {
      data: { username: "e2e_sales", password: "sales123" },
    });
    expect(salesLoginRes.status()).toBe(200);
    const salesToken: string = (await salesLoginRes.json()).token;
    const payload = JSON.parse(
      Buffer.from(salesToken.split(".")[1], "base64url").toString(),
    );

    await ctx.post(`/api/stations/${stationId}/users`, {
      headers: auth,
      data: { userId: payload.id },
    });

    await ctx.dispose();

    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({
        token: salesToken,
        user: { ...(payload.user ?? {}), id: payload.id, roles: payload.roles ?? [] },
      }),
    );
  });

  test("sales user logs in via UI then creates a bill", async ({ page }) => {
    // ── Login ────────────────────────────────────────────────────────────────
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Type username character-by-character so the video shows each keystroke.
    await page.locator("#username").click();
    await page.locator("#username").pressSequentially("e2e_sales", { delay: 80 });

    // Click the numpad "Next" button to move focus to the password field.
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.locator("#password").pressSequentially("sales123", { delay: 80 });

    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/home/billing", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // ── Billing page: fixtures visible ───────────────────────────────────────
    await expect(
      page.getByText(STATION_NAME, { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(CATEGORY_NAME, { exact: false }),
    ).toBeVisible({ timeout: 15000 });

    // ── Pick an item ─────────────────────────────────────────────────────────
    await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
    await expect(
      page.getByRole("row").filter({ hasText: ITEM_NAME }),
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByRole("row")
      .filter({ hasText: ITEM_NAME })
      .getByRole("button", { name: /pick/i })
      .click();

    const qtyModal = page.locator(".modal.show");
    await expect(qtyModal).toBeVisible({ timeout: 5000 });
    await qtyModal.getByRole("button", { name: "1", exact: true }).click();
    await qtyModal.getByRole("button", { name: "Confirm" }).click();
    await expect(qtyModal).not.toBeVisible({ timeout: 10000 });

    // ── Item appears in the bill ──────────────────────────────────────────────
    await expect(
      page.getByRole("cell", { name: ITEM_NAME, exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });

    // ── Open the Create Bill modal ────────────────────────────────────────────
    await page.getByRole("button", { name: /Create Bill/ }).first().click();
    const submitModal = page.locator(".modal.show");
    await expect(submitModal).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/Confirm create bill: KES/i),
    ).toBeVisible({ timeout: 5000 });

    // ── Submit and verify API returns 201 ─────────────────────────────────────
    const [response] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/bills") &&
          resp.request().method() === "POST",
      ),
      submitModal.getByRole("button", { name: /Create Bill/ }).click(),
    ]);
    expect(response.status()).toBe(201);

    // ── Bill created: page resets to fresh state ──────────────────────────────
    await expect(page.getByText(/No items in bill/i)).toBeVisible({
      timeout: 15000,
    });
  });
});
