/**
 * Movie: Menu & Pricing Setup
 *
 * Demonstrates the full setup flow through the admin UI:
 *   1. Login as supervisor
 *   2. Add a Category
 *   3. Add a Pricelist
 *   4. Link the Pricelist to a Station
 *   5. Add Items (with category + pricelist)
 *
 * Run:
 *   npx vitest run --config vitest.config.playwright-seed.ts
 *   npx playwright test --config playwright.movie.config.ts
 *
 * Video saved to: tests/playwright/movie/
 */
import { test, expect, request as playwrightRequest } from "@playwright/test";

const SUPERVISOR_USER = "e2e_supervisor_bills";
const SUPERVISOR_PASS = "supervisor123";
const BASE            = "/supervisor";

const CATEGORY_NAME  = "Demo Beverages";
const PRICELIST_NAME = "Demo Standard Menu";
const STATION_NAME   = "Demo Main Counter";
const ITEM_1_NAME    = "Chicken Burger";
const ITEM_1_CODE    = "CHKBGR";
const ITEM_1_PRICE   = "350";
const ITEM_2_NAME    = "Fresh Orange Juice";
const ITEM_2_CODE    = "FORJ";
const ITEM_2_PRICE   = "120";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

test.describe("Menu & Pricing Setup", () => {
  let stationId: number;

  // Create the demo station silently via API so the UI demo can focus on
  // categories, pricelists and items.
  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: "http://localhost:3000" });
    const loginRes = await ctx.post("/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    const { token } = await loginRes.json();
    const auth = { Authorization: `Bearer ${token}` };

    // Create station (ignore conflict if it already exists from a prior run)
    const stationRes = await ctx.post("/api/stations", {
      headers: auth,
      data: { name: STATION_NAME },
    });
    if (stationRes.status() === 201) {
      stationId = (await stationRes.json()).id;
    } else {
      // Fetch all stations and find ours
      const all = await ctx.get("/api/stations", { headers: auth });
      const stations = await all.json();
      stationId = stations.find((s: any) => s.name === STATION_NAME)?.id;
    }
    await ctx.dispose();
  });

  test("supervisor sets up menu and pricing from scratch", async ({ page }) => {

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 1 — Login
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.locator("#username").click();
    await page.locator("#username").pressSequentially(SUPERVISOR_USER, { delay: 100 });
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.locator("#password").pressSequentially(SUPERVISOR_PASS, { delay: 100 });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/supervisor/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 2 — Add a Category
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/category`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("button", { name: /add category/i }).click();
    await pause(500);

    const categoryNameInput = page.getByPlaceholder("Enter category name");
    await categoryNameInput.click();
    await categoryNameInput.pressSequentially(CATEGORY_NAME, { delay: 80 });
    await pause(400);

    await page.getByRole("button", { name: /add category/i, exact: false }).last().click();
    await pause(800);

    // Confirm it appears in the table
    await expect(page.getByRole("cell", { name: CATEGORY_NAME })).toBeVisible({ timeout: 8000 });
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 3 — Add a Pricelist
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/pricelist`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("button", { name: /add pricelist/i }).click();
    await pause(500);

    const plNameInput = page.getByLabel(/pricelist name/i);
    await plNameInput.click();
    await plNameInput.pressSequentially(PRICELIST_NAME, { delay: 80 });
    await pause(400);

    // Submit add-pricelist form/modal
    await page.getByRole("button", { name: /add pricelist/i }).last().click();
    await pause(1000);

    // Confirm it appears in the pricelists table
    await expect(page.getByRole("cell", { name: PRICELIST_NAME })).toBeVisible({ timeout: 8000 });
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 4 — Link Pricelist to Station
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/station`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    // Click on the demo station row
    await page.getByRole("cell", { name: STATION_NAME }).click();
    await pause(600);

    // Click "Link Pricelist to Station" button
    await page.getByRole("button", { name: /link pricelist to station/i }).click();
    await pause(500);

    // Select the pricelist from the dropdown
    await page.getByRole("combobox").selectOption({ label: PRICELIST_NAME });
    await pause(400);

    // Confirm / submit
    await page.getByRole("button", { name: /link pricelist/i }).last().click();
    await pause(1000);

    // Verify the pricelist now shows under the station
    await expect(page.getByText(PRICELIST_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1200);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 5a — Add first item (Chicken Burger)
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/items`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("button", { name: /add item/i }).click();
    await pause(500);

    await page.getByLabel(/item name/i).pressSequentially(ITEM_1_NAME, { delay: 80 });
    await pause(300);

    await page.getByLabel(/item code/i).pressSequentially(ITEM_1_CODE, { delay: 80 });
    await pause(300);

    await page.getByLabel(/category/i).selectOption({ label: CATEGORY_NAME });
    await pause(300);

    await page.getByLabel(/pricelist/i).selectOption({ label: PRICELIST_NAME });
    await pause(300);

    await page.getByLabel(/price/i).pressSequentially(ITEM_1_PRICE, { delay: 80 });
    await pause(400);

    await page.getByRole("button", { name: /save|add item/i }).last().click();
    await pause(1000);

    // Confirm item appears in the list
    await expect(page.getByText(ITEM_1_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 5b — Add second item (Fresh Orange Juice)
     * ──────────────────────────────────────────────────────────────────────── */
    await page.getByRole("button", { name: /add item/i }).click();
    await pause(500);

    await page.getByLabel(/item name/i).pressSequentially(ITEM_2_NAME, { delay: 80 });
    await pause(300);

    await page.getByLabel(/item code/i).pressSequentially(ITEM_2_CODE, { delay: 80 });
    await pause(300);

    await page.getByLabel(/category/i).selectOption({ label: CATEGORY_NAME });
    await pause(300);

    await page.getByLabel(/pricelist/i).selectOption({ label: PRICELIST_NAME });
    await pause(300);

    await page.getByLabel(/price/i).pressSequentially(ITEM_2_PRICE, { delay: 80 });
    await pause(400);

    await page.getByRole("button", { name: /save|add item/i }).last().click();
    await pause(1000);

    await expect(page.getByText(ITEM_2_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1500);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 6 — Verify on Categories page that items are linked
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/category`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("cell", { name: CATEGORY_NAME }).click();
    await pause(600);

    await expect(page.getByText(ITEM_1_NAME)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(ITEM_2_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1500);
  });
});
