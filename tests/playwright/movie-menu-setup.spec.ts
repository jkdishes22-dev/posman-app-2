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
  // Ensure exactly ONE active demo station exists.
  // Deletes duplicate stations from prior runs, then creates/activates one.
  test.beforeAll(async () => {
    const ctx = await playwrightRequest.newContext({ baseURL: "http://localhost:3010" });
    const loginRes = await ctx.post("/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    const { token } = await loginRes.json();
    const auth = { Authorization: `Bearer ${token}` };

    const allRes = await ctx.get("/api/stations", { headers: auth });
    const allBody = await allRes.json();
    const all: any[] = Array.isArray(allBody) ? allBody : [];
    const matches = all.filter((s: any) => s.name === STATION_NAME);

    // Soft-delete all but the first match (keeps the table clean for the demo)
    for (const s of matches.slice(1)) {
      await ctx.delete(`/api/stations/${s.id}`, { headers: auth });
    }

    let stationId: number | undefined = matches[0]?.id;
    if (!stationId) {
      const createRes = await ctx.post("/api/stations", { headers: auth, data: { name: STATION_NAME } });
      if (createRes.status() === 201) stationId = (await createRes.json()).id;
    }

    // Ensure the one remaining station is active
    if (stationId) {
      await ctx.patch(`/api/stations/${stationId}/status`, { headers: auth, data: { action: "activate" } });
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
    await expect(page.getByRole("cell", { name: CATEGORY_NAME }).first()).toBeVisible({ timeout: 8000 });
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 3 — Add a Pricelist
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/pricelist`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("button", { name: /add pricelist/i }).click();
    await pause(500);

    await page.locator("#name").click();
    await page.locator("#name").pressSequentially(PRICELIST_NAME, { delay: 80 });
    await pause(400);

    // Select which station this pricelist applies to
    await page.locator("#station").selectOption({ label: STATION_NAME });
    await pause(400);

    // Submit add-pricelist form/modal
    await page.getByRole("button", { name: /add pricelist/i }).last().click();
    await pause(1000);

    // Confirm it appears in the pricelists table
    await expect(page.getByRole("cell", { name: PRICELIST_NAME }).first()).toBeVisible({ timeout: 8000 });
    await pause(800);

    // Activate the pricelist (defaults to inactive) so items can be linked
    const plRow = page.locator("tr").filter({ hasText: PRICELIST_NAME }).last();
    await plRow.getByTitle("Activate").click();
    await pause(500);
    await page.locator('.modal.show').getByRole("button", { name: /activate pricelist/i }).click();
    await page.waitForFunction(() => !document.querySelector('.modal.show'), { timeout: 8000 });
    await pause(800);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 4 — Link Pricelist to Station
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/station`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    // Wait for station data to load, then click the active station row.
    // Active stations use bg-success badge; inactive use bg-secondary — this
    // is more reliable than text-matching "Active" which is a substring of "Inactive".
    await page.locator("tbody tr").first().waitFor({ state: "visible", timeout: 15_000 });
    const activeStationRow = page.locator("tbody tr")
      .filter({ hasText: STATION_NAME })
      .filter({ has: page.locator("span.badge.bg-success") })
      .first();
    await activeStationRow.locator("td").nth(1).click();
    // Wait for the "Add" button to appear (confirms selectedStationId was set)
    await page.locator(".card").filter({ hasText: "Linked Pricelists" }).getByRole("button", { name: "Add" }).waitFor({ state: "visible", timeout: 10_000 });
    await pause(600);

    // Click "Add" under the Linked Pricelists card to open the link modal
    const pricelistCard = page.locator(".card").filter({ hasText: "Linked Pricelists" });
    await pricelistCard.getByRole("button", { name: "Add" }).click();
    await pause(800);

    // Each pricelist appears as a list item with a "Link" button — click ours.
    // There may be duplicate names from prior runs; link the last one (most recently added).
    const modal = page.locator('.modal.show');
    await modal.locator(".list-group-item").filter({ hasText: PRICELIST_NAME }).first().waitFor({ state: "visible", timeout: 8000 });
    await modal.locator(".list-group-item").filter({ hasText: PRICELIST_NAME }).last().getByRole("button", { name: "Link" }).click();
    await pause(1000);

    // Verify the pricelist now shows under the station
    await expect(page.getByText(PRICELIST_NAME).first()).toBeVisible({ timeout: 8000 });
    await pause(1200);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 5a — Add first item (Chicken Burger)
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/items`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("button", { name: /add item/i }).click();
    await pause(500);

    await page.locator("#add-item-name").pressSequentially(ITEM_1_NAME, { delay: 80 });
    await pause(300);

    await page.locator("#add-item-code").pressSequentially(ITEM_1_CODE, { delay: 80 });
    await pause(300);

    await page.locator("#add-item-category").selectOption({ label: CATEGORY_NAME });
    await pause(300);

    await page.locator("#add-item-pricelist").selectOption({ label: PRICELIST_NAME });
    await pause(300);

    await page.locator("#add-item-price").pressSequentially(ITEM_1_PRICE, { delay: 80 });
    await pause(400);

    await page.locator('.modal.show').getByRole("button", { name: /add item/i }).click();
    await pause(1000);

    // Confirm item appears in the list
    await expect(page.getByText(ITEM_1_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1000);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 5b — Add second item (Fresh Orange Juice)
     * ──────────────────────────────────────────────────────────────────────── */
    await page.getByRole("button", { name: /add item/i }).click();
    await pause(500);

    await page.locator("#add-item-name").pressSequentially(ITEM_2_NAME, { delay: 80 });
    await pause(300);

    await page.locator("#add-item-code").pressSequentially(ITEM_2_CODE, { delay: 80 });
    await pause(300);

    await page.locator("#add-item-category").selectOption({ label: CATEGORY_NAME });
    await pause(300);

    await page.locator("#add-item-pricelist").selectOption({ label: PRICELIST_NAME });
    await pause(300);

    await page.locator("#add-item-price").pressSequentially(ITEM_2_PRICE, { delay: 80 });
    await pause(400);

    await page.locator('.modal.show').getByRole("button", { name: /add item/i }).click();
    await pause(1000);

    await expect(page.getByText(ITEM_2_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1500);

    /* ────────────────────────────────────────────────────────────────────────
     * STEP 6 — Verify on Categories page that items are linked
     * ──────────────────────────────────────────────────────────────────────── */
    await page.goto(`${BASE}/menu/category`);
    await page.waitForLoadState("networkidle");
    await pause(800);

    await page.getByRole("cell", { name: CATEGORY_NAME }).first().click();
    await pause(600);

    await expect(page.getByText(ITEM_1_NAME)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(ITEM_2_NAME)).toBeVisible({ timeout: 8000 });
    await pause(1500);
  });
});
