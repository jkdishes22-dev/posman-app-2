import { test, expect, request as playwrightRequest, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

// Fixed names — safe because the seed always starts from a clean DB.
const STATION_NAME = "E2E Billing Station";
const PRICELIST_NAME = "E2E Billing Pricelist";
const CATEGORY_NAME = "E2E Billing Category";
const ITEM_NAME = "E2E Billing Item";
const ITEM_CODE = "E2EBILL";
const ITEM_PRICE = 150;

// Persisted across beforeAll re-invocations (Playwright re-evaluates the module
// per describe group, so module-level vars reset). Using a side-channel file as
// a cheap idempotency guard.
const STATE_FILE = path.join(
  process.cwd(),
  ".test-db",
  "billing-test-state.json",
);

let salesToken = "";
let salesUserData: unknown = null;

function tokenIsValid(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return !payload.exp || payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const s = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
      const token = s.token ?? "";
      if (token && tokenIsValid(token)) {
        salesToken = token;
        salesUserData = s.user ?? null;
      }
    }
  } catch {
    // ignore — will re-run setup
  }
}

async function adminToken(): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.post("/api/auth/login", {
    data: { username: "admin", password: "admin123" },
  });
  const body = await res.json();
  await ctx.dispose();
  return body.token as string;
}

// Load persisted state immediately at module evaluation so beforeAll can skip early.
loadState();

test.describe("Billing flow", () => {
  test.beforeAll(async () => {
    // Re-check file in case another module evaluation already ran setup.
    loadState();
    if (salesToken) return;

    const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
    const token = await adminToken();
    const auth = { Authorization: `Bearer ${token}` };

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

    // Category
    const catRes = await ctx.post("/api/menu/categories", {
      headers: auth,
      data: { name: CATEGORY_NAME },
    });
    expect(catRes.status()).toBe(201);
    const categoryId: number = (await catRes.json()).id;

    // Item (allowNegativeInventory so Pick is never disabled by stock)
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

    // Login as e2e_sales — decode JWT for id + user fields
    const loginRes = await ctx.post("/api/auth/login", {
      data: { username: "e2e_sales", password: "sales123" },
    });
    expect(loginRes.status()).toBe(200);
    salesToken = (await loginRes.json()).token;
    const payload = JSON.parse(
      Buffer.from(salesToken.split(".")[1], "base64url").toString(),
    );
    salesUserData = {
      ...(payload.user ?? {}),
      id: payload.id,
      roles: payload.roles ?? [],
    };

    // Assign e2e_sales to station
    await ctx.post(`/api/stations/${stationId}/users`, {
      headers: auth,
      data: { userId: payload.id },
    });

    await ctx.dispose();

    // Persist state so subsequent beforeAll calls (from re-evaluated modules) skip setup.
    fs.writeFileSync(
      STATE_FILE,
      JSON.stringify({ token: salesToken, user: salesUserData }),
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ token, user, ts }) => {
        window.localStorage.setItem("token", token);
        window.localStorage.setItem("user", JSON.stringify(user));
        window.localStorage.setItem("token_set_time", ts);
      },
      { token: salesToken, user: salesUserData, ts: String(Date.now()) },
    );
    await page.goto("/home/billing");
    await page.waitForLoadState("networkidle");
  });

  // ── Helper ──────────────────────────────────────────────────────────────────

  async function addItemToBill(page: Page) {
    await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
    await page
      .getByRole("row")
      .filter({ hasText: ITEM_NAME })
      .getByRole("button", { name: /pick/i })
      .click();
    const modal = page.locator(".modal.show");
    await modal.getByRole("button", { name: "1", exact: true }).click();
    await modal.getByRole("button", { name: "Confirm" }).click();
    await expect(modal).not.toBeVisible();
  }

  // ── Page load ────────────────────────────────────────────────────────────────

  test.describe("Page load", () => {
    test("shows the billing page after login as sales", async ({ page }) => {
      await expect(page).toHaveURL("/home/billing");
    });

    test("displays station badge once a station is loaded", async ({ page }) => {
      await expect(
        page.getByText(STATION_NAME, { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });

    test("shows the category panel", async ({ page }) => {
      await expect(
        page.getByText(CATEGORY_NAME, { exact: false }),
      ).toBeVisible({ timeout: 15000 });
    });
  });

  // ── Item selection ───────────────────────────────────────────────────────────

  test.describe("Item selection", () => {
    test("clicking a category shows the item list", async ({ page }) => {
      await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
      await expect(
        page.getByRole("row").filter({ hasText: ITEM_NAME }),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Pick button is visible for the item", async ({ page }) => {
      await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
      await expect(
        page
          .getByRole("row")
          .filter({ hasText: ITEM_NAME })
          .getByRole("button", { name: /pick/i }),
      ).toBeVisible({ timeout: 10000 });
    });

    test("clicking Pick opens the quantity modal", async ({ page }) => {
      await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
      await page
        .getByRole("row")
        .filter({ hasText: ITEM_NAME })
        .getByRole("button", { name: /pick/i })
        .click();
      await expect(
        page.getByText(`Specify Quantity for ${ITEM_NAME}`, { exact: false }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("Confirm is disabled until a positive quantity is entered", async ({
      page,
    }) => {
      await page.getByText(CATEGORY_NAME, { exact: false }).first().click();
      await page
        .getByRole("row")
        .filter({ hasText: ITEM_NAME })
        .getByRole("button", { name: /pick/i })
        .click();
      const modal = page.locator(".modal.show");
      await expect(
        modal.getByRole("button", { name: "Confirm" }),
      ).toBeDisabled();
    });

    test("adding an item via numpad appends it to the bill", async ({
      page,
    }) => {
      await addItemToBill(page);
      // Scope to the bill's item table (avoids matching the category items list)
      await expect(
        page.getByRole("cell", { name: ITEM_NAME, exact: true }).first(),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  // ── Create Bill modal ────────────────────────────────────────────────────────

  test.describe("Create Bill modal", () => {
    test.beforeEach(async ({ page }) => {
      await addItemToBill(page);
    });

    test("Create Bill button becomes enabled after adding an item", async ({
      page,
    }) => {
      await expect(
        page.getByRole("button", { name: /Create Bill/ }).first(),
      ).toBeEnabled({ timeout: 5000 });
    });

    test("clicking Create Bill opens the confirmation modal", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await expect(page.getByText(/Confirm create bill/i)).toBeVisible({
        timeout: 5000,
      });
    });

    test("confirmation modal shows KES total", async ({ page }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await expect(page.getByText(/Confirm create bill: KES/i)).toBeVisible({
        timeout: 5000,
      });
    });

    test("cash toggle and M-Pesa toggle are present", async ({ page }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await expect(page.getByTestId("payment-method-cash")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("payment-method-mpesa")).toBeVisible({
        timeout: 5000,
      });
    });

    test("submit button inside dialog reads 'Create Bill'", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: /Create Bill/ }),
      ).toBeVisible({ timeout: 5000 });
    });

    test("enabling cash toggle changes submit label to 'Create & Settle (Cash)'", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await page.getByTestId("payment-method-cash").click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("button", { name: /Create & Settle \(Cash\)/i }),
      ).toBeVisible({ timeout: 5000 });
    });

    test.describe("Keypad (M-Pesa QWERTY keyboard)", () => {
      test.beforeEach(async ({ page }) => {
        await page.getByRole("button", { name: /Create Bill/ }).first().click();
        await expect(page.getByText(/Confirm create bill/i)).toBeVisible({ timeout: 5000 });
        await page.getByTestId("payment-method-mpesa").click();
      });

      test("modal dialog uses the wider submit-bill-modal-dialog class", async ({ page }) => {
        await expect(page.locator(".modal-dialog.submit-bill-modal-dialog")).toBeVisible({ timeout: 5000 });
      });

      test("QWERTY keyboard appears when M-Pesa is selected", async ({ page }) => {
        await expect(page.locator(".submit-bill-vkeyboard")).toBeVisible({ timeout: 5000 });
      });

      test("keyboard keys use btn-outline-secondary styling", async ({ page }) => {
        const qKey = page.locator(".submit-bill-vkeyboard button").filter({ hasText: /^Q$/i }).first();
        await expect(qKey).toBeVisible({ timeout: 5000 });
        await expect(qKey).toHaveClass(/btn-outline-secondary/);
      });

      test("keyboard keys use comfortable row padding (py-3)", async ({ page }) => {
        const qKey = page.locator(".submit-bill-vkeyboard button").filter({ hasText: /^Q$/i }).first();
        await expect(qKey).toBeVisible({ timeout: 5000 });
        await expect(qKey).toHaveClass(/py-3/);
      });

      test("all three QWERTY rows are present", async ({ page }) => {
        const keyboard = page.locator(".submit-bill-vkeyboard");
        await expect(keyboard).toBeVisible({ timeout: 5000 });
        for (const letter of ["Q", "A", "Z"]) {
          await expect(
            keyboard.getByRole("button", { name: letter, exact: true }),
          ).toBeVisible();
        }
      });

      test("Caps Lock, Space, Backspace, Clear keys are present", async ({ page }) => {
        const keyboard = page.locator(".submit-bill-vkeyboard");
        await expect(keyboard.getByRole("button", { name: "Caps Lock", exact: true })).toBeVisible({ timeout: 5000 });
        await expect(keyboard.getByRole("button", { name: "Space", exact: true })).toBeVisible();
        await expect(keyboard.getByRole("button", { name: "Backspace", exact: true })).toBeVisible();
        await expect(keyboard.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
      });
    });
  });

  // ── Bill creation ────────────────────────────────────────────────────────────

  test.describe("Bill creation", () => {
    test.beforeEach(async ({ page }) => {
      await addItemToBill(page);
    });

    test("submitting a bill calls POST /api/bills and returns 201", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      const [response] = await Promise.all([
        page.waitForResponse(
          (resp) =>
            resp.url().includes("/api/bills") &&
            resp.request().method() === "POST",
        ),
        page
          .locator(".modal.show")
          .getByRole("button", { name: /Create Bill/ })
          .click(),
      ]);
      expect(response.status()).toBe(201);
    });

    test("confirmation modal closes after successful submission", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await page
        .locator(".modal.show")
        .getByRole("button", { name: /Create Bill/ })
        .click();
      await expect(page.getByText(/Confirm create bill/i)).not.toBeVisible({
        timeout: 15000,
      });
    });

    test("bill items are cleared after successful submission", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /Create Bill/ }).first().click();
      await page
        .locator(".modal.show")
        .getByRole("button", { name: /Create Bill/ })
        .click();
      await expect(page.getByText(/No items in bill/i)).toBeVisible({
        timeout: 15000,
      });
    });
  });

  // ── Clear bill ───────────────────────────────────────────────────────────────

  test.describe("Clear bill", () => {
    test.beforeEach(async ({ page }) => {
      await addItemToBill(page);
    });

    test("Clear button opens the Cancel Billing modal", async ({ page }) => {
      await page.getByRole("button", { name: /clear/i }).first().click();
      await expect(page.getByText("Cancel Billing")).toBeVisible({
        timeout: 5000,
      });
    });

    test("'No, Keep Items' dismisses the cancel modal", async ({ page }) => {
      await page.getByRole("button", { name: /clear/i }).first().click();
      await page.getByRole("button", { name: "No, Keep Items" }).click();
      await expect(page.getByText("Cancel Billing")).not.toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByRole("cell", { name: ITEM_NAME, exact: true }).first(),
      ).toBeVisible();
    });

    test("'Yes, Clear All' removes all items from the bill", async ({
      page,
    }) => {
      await page.getByRole("button", { name: /clear/i }).first().click();
      await page.getByRole("button", { name: "Yes, Clear All" }).click();
      await expect(
        page.getByRole("cell", { name: ITEM_NAME, exact: true }),
      ).not.toBeVisible({ timeout: 5000 });
    });
  });
});
