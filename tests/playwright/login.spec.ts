import { test, expect } from '@playwright/test';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Form rendering', () => {
    test('renders username and password fields with labels', async ({ page }) => {
      await expect(page.locator('#username')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.getByText('User name / code')).toBeVisible();
      await expect(page.getByText('Password')).toBeVisible();
    });

    test('password field masks input', async ({ page }) => {
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    });

    test('logo renders correctly', async ({ page }) => {
      const logo = page.locator('img[alt="JK PosMan"]');
      await expect(logo).toBeVisible();
      await expect(logo).toHaveAttribute('src', '/images/jk-big.png');
    });

    test('numpad digits 0-9 are visible', async ({ page }) => {
      for (const digit of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']) {
        await expect(page.getByRole('button', { name: digit, exact: true })).toBeVisible();
      }
    });

    test('Next and Backspace buttons are visible', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /backspace/i })).toBeVisible();
    });
  });

  test.describe('Form validation', () => {
    test('submit button is disabled on empty form', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    test('submit button is disabled when only username is filled', async ({ page }) => {
      await page.fill('#username', 'admin');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    test('submit button is disabled when only password is filled', async ({ page }) => {
      await page.fill('#password', 'admin123');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    });

    test('submit button becomes enabled when both fields are filled', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await expect(page.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });
  });

  test.describe('Numpad and keyboard interaction', () => {
    test('numpad digits append to username field by default', async ({ page }) => {
      await page.getByRole('button', { name: '1', exact: true }).click();
      await page.getByRole('button', { name: '2', exact: true }).click();
      await page.getByRole('button', { name: '3', exact: true }).click();
      await expect(page.locator('#username')).toHaveValue('123');
    });

    test('Next button switches numpad input to password field', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.getByRole('button', { name: '4', exact: true }).click();
      await page.getByRole('button', { name: '5', exact: true }).click();
      await expect(page.locator('#password')).toHaveValue('45');
    });

    test('numpad Backspace removes last character from active field', async ({ page }) => {
      await page.getByRole('button', { name: '1', exact: true }).click();
      await page.getByRole('button', { name: '2', exact: true }).click();
      await page.getByRole('button', { name: '3', exact: true }).click();
      await page.getByRole('button', { name: /backspace/i }).click();
      await expect(page.locator('#username')).toHaveValue('12');
    });

    test('Tab key on username field moves focus to password', async ({ page }) => {
      await page.locator('#username').click();
      await page.locator('#username').press('Tab');
      await expect(page.locator('#password')).toBeFocused();
    });

    test('Enter key on username field moves focus to password', async ({ page }) => {
      await page.locator('#username').click();
      await page.locator('#username').press('Enter');
      await expect(page.locator('#password')).toBeFocused();
    });
  });

  test.describe('Authentication', () => {
    test('invalid credentials shows error alert', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.locator('.alert-danger').first()).toBeVisible();
    });

    test('invalid credentials shows "Invalid username or password" message', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'wrongpassword');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Invalid username or password')).toBeVisible();
    });

    test('admin login redirects to /admin', async ({ page }) => {
      await page.fill('#username', 'admin');
      await page.fill('#password', 'admin123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/admin');
    });

    test('supervisor login redirects to /supervisor', async ({ page }) => {
      await page.fill('#username', 'e2e_supervisor_bills');
      await page.fill('#password', 'supervisor123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/supervisor');
    });

    test('cashier login redirects to /home/cashier', async ({ page }) => {
      await page.fill('#username', 'e2e_cashier');
      await page.fill('#password', 'cashier123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/home/cashier');
    });

    test('sales login redirects to /home/billing', async ({ page }) => {
      await page.fill('#username', 'e2e_sales');
      await page.fill('#password', 'sales123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/home/billing');
    });

    test('storekeeper login redirects to /storekeeper', async ({ page }) => {
      await page.fill('#username', 'e2e_storekeeper');
      await page.fill('#password', 'storekeeper123');
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL('/storekeeper');
    });
  });
});