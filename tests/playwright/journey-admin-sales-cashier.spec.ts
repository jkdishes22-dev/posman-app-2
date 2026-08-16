/**
 * Three-phase end-to-end journey for demo video:
 *
 *  Phase 1 — Admin logs in and navigates the configured system
 *             (station, pricelist, users — fixtures created via API in beforeAll)
 *  Phase 2 — Sales user logs in, adds an item and submits a cash-settled bill
 *  Phase 3 — Cashier logs in and closes the submitted bill
 *
 * Run after seeding:
 *   npx vitest run --config vitest.config.playwright-seed.ts
 *   npx playwright test tests/playwright/journey-admin-sales-cashier.spec.ts
 */
import { test, expect, request as playwrightRequest, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

// Journey-specific fixtures (separate from billing.spec names to avoid conflicts).
const STATION_NAME = "Demo Station";
const PRICELIST_NAME = "Demo Pricelist";
const CATEGORY_NAME = "Demo Beverages";
const ITEM_NAME = "Demo Flat White";
const ITEM_CODE = "DMOCFW";
const ITEM_PRICE = 250;

const STATE_FILE = path.join(
  process.cwd(),
  ".test-db",
  "journey-admin-sales-cashier-state.json",
);

interface JourneyState {
  salesToken: string;
  salesUser: unknown;
  cashierToken: string;
  cashierUser: unknown;
}

function tokenIsValid(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function loadState(): JourneyState | null {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      if (s.salesToken && s.cashierToken && tokenIsValid(s.salesToken)) return s as JourneyState;
    }
  } catch {}
  return null;
}

let state: JourneyState | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Type credentials one character at a time then click Sign in. */
async function loginViaUI(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.locator("#username").click();
  await page.locator("#username").pressSequentially(username, { delay: 60 });
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator("#password").pressSequentially(password, { delay: 60 });
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Clear auth from localStorage and return to login page. */
async function logout(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token_set_time");
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.describe("Admin → Sales → Cashier journey", () => {
  test.beforeAll(async () => {
    state = loadState();
    if (state) return;

    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });

    // Admin token
    const adminLoginRes = await ctx.post("/api/auth/login", {
      data: { username: "admin", password: "admin123" },
    });
    expect(adminLoginRes.status()).toBe(200);
    const adminToken: string = (await adminLoginRes.json()).token;
    const auth = { Authorization: `Bearer ${adminToken}` };

    // Station
    const stationRes = await ctx.post("/api/stations", {
      headers: auth,
      data: { name: STATION_NAME },
    });
    expect(stationRes.status()).toBe(201);
    const stationId: number = (await stationRes.json()).id;

    // Pricelist
    const plRes = await ctx.post("/api/menu/pricelists", {
      headers: auth,
      data: { name: PRICELIST_NAME, code: "DMO-PL" },
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

    // Category
    const catRes = await ctx.post("/api/menu/categories", {
      headers: auth,
      data: { name: CATEGORY_NAME },
    });
    expect(catRes.status()).toBe(201);
    const categoryId: number = (await catRes.json()).id;

    // Item
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

    // Sales user — use the seeded e2e_sales2 account (dedicated to this journey spec)
    const salesLoginRes = await ctx.post("/api/auth/login", {
      data: { username: "e2e_sales2", password: "sales123" },
    });
    expect(salesLoginRes.status()).toBe(200);
    const salesToken: string = (await salesLoginRes.json()).token;
    const salesPayload = JSON.parse(
      Buffer.from(salesToken.split(".")[1], "base64url").toString(),
    );
    const salesUser = {
      ...(salesPayload.user ?? {}),
      id: salesPayload.id,
      roles: salesPayload.roles ?? [],
    };

    // Assign sales user to Demo Station
    await ctx.post(`/api/stations/${stationId}/users`, {
      headers: auth,
      data: { userId: salesPayload.id },
    });

    // Set Demo Station as default for sales user so billing page loads it
    await ctx.post(`/api/users/${salesPayload.id}/default-station`, {
      headers: auth,
      data: { stationId },
    }).catch(() => {
      // Endpoint may not exist; page will still work if there is only one station.
    });

    // Cashier user — use the seeded e2e_cashier2 account (dedicated to this journey spec)
    const cashierLoginRes = await ctx.post("/api/auth/login", {
      data: { username: "e2e_cashier2", password: "cashier123" },
    });
    expect(cashierLoginRes.status()).toBe(200);
    const cashierToken: string = (await cashierLoginRes.json()).token;
    const cashierPayload = JSON.parse(
      Buffer.from(cashierToken.split(".")[1], "base64url").toString(),
    );
    const cashierUser = {
      ...(cashierPayload.user ?? {}),
      id: cashierPayload.id,
      roles: cashierPayload.roles ?? [],
    };

    // Assign cashier to Demo Station so they can see its bills
    await ctx.post(`/api/stations/${stationId}/users`, {
      headers: auth,
      data: { userId: cashierPayload.id },
    });

    await ctx.dispose();

    state = { salesToken, salesUser, cashierToken, cashierUser };
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  });

  // ── The journey ───────────────────────────────────────────────────────────

  test("admin reviews setup → sales creates cash-settled bill → cashier closes it", async ({
    page,
  }) => {
    test.setTimeout(120000);
    // ════════════════════════════════════════════════════════════════════════
    //  Phase 1: Admin logs in and reviews the configured system
    // ════════════════════════════════════════════════════════════════════════

    await loginViaUI(page, "admin", "admin123");
    await expect(page).toHaveURL("/admin", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Station management — verify Demo Station is listed
    await page.goto("/admin/station");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(STATION_NAME, { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    // Pricelist management — verify Demo Pricelist is listed
    await page.goto("/admin/menu/pricelist");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(PRICELIST_NAME, { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    // User management — verify e2e_sales user is present (table shows firstName/lastName, not username)
    await page.goto("/admin/users/view");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText("Sales", { exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });

    await logout(page);
    await expect(page.locator("#username")).toBeVisible({ timeout: 10000 });

    // ════════════════════════════════════════════════════════════════════════
    //  Phase 2: Sales user logs in and creates a cash-settled bill
    // ════════════════════════════════════════════════════════════════════════

    await loginViaUI(page, "e2e_sales2", "sales123");
    await expect(page).toHaveURL("/home/billing", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Wait for the Demo Station badge and Demo Beverages category to appear
    await expect(
      page.getByText(STATION_NAME, { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(CATEGORY_NAME, { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Pick one Demo Flat White
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

    // Item is in the bill — verify it appears in the bill table
    await expect(
      page.getByRole("cell", { name: ITEM_NAME, exact: true }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Open Create Bill modal
    await page.getByRole("button", { name: /Create Bill/ }).first().click();
    const submitModal = page.locator(".modal.show");
    await expect(submitModal).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/Confirm create bill: KES/i),
    ).toBeVisible({ timeout: 5000 });

    // Select Cash payment method — bill will be auto-submitted with cash payment
    await page.getByTestId("payment-method-cash").click();
    await expect(
      submitModal.getByRole("button", { name: /Create & Settle \(Cash\)/i }),
    ).toBeVisible({ timeout: 3000 });

    // Fire the request and wait for BOTH the bill creation AND the cash submit
    // so the cashier sees a "submitted" bill when they navigate.
    const billCreatePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/bills") &&
        !resp.url().includes("submit") &&
        resp.request().method() === "POST",
    );
    const cashSubmitPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/bills/submit") &&
        resp.request().method() === "POST",
    );

    await submitModal
      .getByRole("button", { name: /Create & Settle \(Cash\)/i })
      .click();

    const billCreateRes = await billCreatePromise;
    expect(billCreateRes.status()).toBe(201);
    const billBody = await billCreateRes.json();
    const billId: number = billBody.id ?? billBody.bill?.id;

    // Wait for cash submit to complete before switching to cashier
    const cashSubmitRes = await cashSubmitPromise;
    expect(cashSubmitRes.status()).toBe(200);

    // Page resets to fresh state after successful submission
    await expect(page.getByText(/No items in bill/i)).toBeVisible({
      timeout: 15000,
    });

    await logout(page);
    await expect(page.locator("#username")).toBeVisible({ timeout: 10000 });

    // ════════════════════════════════════════════════════════════════════════
    //  Phase 3: Cashier logs in and closes the submitted bill
    // ════════════════════════════════════════════════════════════════════════

    await loginViaUI(page, "e2e_cashier2", "cashier123");
    await expect(page).toHaveURL("/home/cashier", { timeout: 15000 });
    await page.waitForLoadState("networkidle");

    // Navigate directly to the bill using the ?billId URL parameter
    await page.goto(`/home/cashier/bills?billId=${billId}`);
    await page.waitForLoadState("networkidle");

    // The bill should be auto-selected and its detail panel visible
    await expect(
      page.getByText(`Bill ID:`, { exact: false }).first(),
    ).toBeVisible({ timeout: 15000 });

    // The bill is fully paid (cash settled), so "Close Bill" should be enabled
    await expect(
      page.getByRole("button", { name: /Close Bill/i }).first(),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: /Close Bill/i }).first().click();

    // Confirm in the Close Bill modal
    const closeModal = page.locator(".modal.show");
    await expect(closeModal).toBeVisible({ timeout: 5000 });
    await expect(closeModal.getByText("Close Bill").first()).toBeVisible();
    await closeModal
      .getByRole("button", { name: /Close Bill/i })
      .click();

    // Success — bill is now closed
    await expect(
      page.getByText(/Bill is closed/i),
    ).toBeVisible({ timeout: 15000 });
  });
});
