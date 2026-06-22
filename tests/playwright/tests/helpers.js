export function uniqueUser(prefix = 'user') {
  const stamp = Date.now() + Math.floor(Math.random() * 1000);
  return {
    name: `${prefix} ${stamp}`,
    email: `${prefix}.${stamp}@example.com`,
    password: 'Password123!',
  };
}

export async function registerViaUi(page, user) {
  await page.goto('/register');
  await page.getByTestId('name-input').fill(user.name);
  await page.getByTestId('email-input').fill(user.email);
  await page.getByTestId('password-input').fill(user.password);
  await page.getByTestId('register-submit').click();
  await page.waitForURL('/');
}

export async function createProject(page, name, description = 'Seeded by E2E') {
  await page.getByTestId('new-project-btn').click();
  await page.getByTestId('project-name-input').fill(name);
  await page.getByTestId('project-desc-input').fill(description);
  await page.getByTestId('project-save').click();
  await page.getByTestId('project-modal').waitFor({ state: 'detached' });
}
