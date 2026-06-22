import { test, expect } from '@playwright/test';
import { uniqueUser, registerViaUi } from './helpers';

test.describe('Authentication', () => {
  test('UI-01 register with valid data lands on dashboard', async ({ page }) => {
    const user = uniqueUser('reg');
    await registerViaUi(page, user);
    await expect(page).toHaveURL('/');
    await expect(page.getByTestId('user-name')).toHaveText(user.name);
  });

  test('UI-02 register shows client-side error for short password', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('name-input').fill('Short Pass');
    await page.getByTestId('email-input').fill('short@example.com');
    await page.getByTestId('password-input').fill('123');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('password-error')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });

  test('UI-03 register shows error for invalid email format', async ({ page }) => {
    await page.goto('/register');
    await page.getByTestId('name-input').fill('Bad Email');
    await page.getByTestId('email-input').fill('not-an-email');
    await page.getByTestId('password-input').fill('Password123!');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('email-error')).toBeVisible();
  });

  test('UI-04 login with valid credentials succeeds', async ({ page }) => {
    const user = uniqueUser('login');
    await registerViaUi(page, user);
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL('/login');

    await page.getByTestId('email-input').fill(user.email);
    await page.getByTestId('password-input').fill(user.password);
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL('/');
  });

  test('UI-05 login with wrong password shows server error', async ({ page }) => {
    const user = uniqueUser('wrongpw');
    await registerViaUi(page, user);
    await page.getByTestId('logout-btn').click();

    await page.getByTestId('email-input').fill(user.email);
    await page.getByTestId('password-input').fill('WrongPassword99');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('UI-06 logout returns to login and protects dashboard', async ({ page }) => {
    const user = uniqueUser('logout');
    await registerViaUi(page, user);
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL('/login');
    // Direct navigation to protected route redirects to login
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('UI-07 unauthenticated user is redirected from project page', async ({ page }) => {
    await page.goto('/projects/some-id');
    await expect(page).toHaveURL('/login');
  });
});
