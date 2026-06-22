import { test, expect } from '@playwright/test';
import { uniqueUser, registerViaUi, createProject } from './helpers';

test.describe('Projects', () => {
  test('UI-08 create project appears in dashboard grid', async ({ page }) => {
    const user = uniqueUser('proj');
    await registerViaUi(page, user);
    await createProject(page, 'Apollo Project');
    await expect(page.getByTestId('project-grid')).toContainText('Apollo Project');
  });

  test('UI-09 create project requires a name', async ({ page }) => {
    const user = uniqueUser('projval');
    await registerViaUi(page, user);
    await page.getByTestId('new-project-btn').click();
    await page.getByTestId('project-save').click();
    await expect(page.getByTestId('project-name-error')).toBeVisible();
  });

  test('UI-10 dashboard stat reflects new project count', async ({ page }) => {
    const user = uniqueUser('stat');
    await registerViaUi(page, user);
    await expect(page.getByTestId('stat-projects')).toContainText('0');
    await createProject(page, 'Stat Project');
    await expect(page.getByTestId('stat-projects')).toContainText('1');
  });

  test('UI-11 open project detail from card', async ({ page }) => {
    const user = uniqueUser('open');
    await registerViaUi(page, user);
    await createProject(page, 'Detail Project');
    await page.getByTestId('project-card').first().click();
    await expect(page.getByTestId('project-title')).toHaveText('Detail Project');
  });

  test('UI-12 archive project shows archived tag', async ({ page }) => {
    const user = uniqueUser('arch');
    await registerViaUi(page, user);
    await createProject(page, 'Archive Me');
    await page.getByTestId('project-card').first().click();
    page.on('dialog', (d) => d.accept());
    await page.getByTestId('archive-project-btn').click();
    await page.getByTestId('back-dashboard').click();
    await expect(page.getByTestId('archived-tag').first()).toBeVisible();
  });
});
