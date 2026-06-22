import { test, expect } from '@playwright/test';
import { uniqueUser, registerViaUi, createProject } from './helpers';

async function setup(page, projectName = 'Issue Project') {
  const user = uniqueUser('issue');
  await registerViaUi(page, user);
  await createProject(page, projectName);
  await page.getByTestId('project-card').first().click();
  await expect(page.getByTestId('project-title')).toHaveText(projectName);
}

async function createIssue(page, { title, priority = 'MEDIUM', status = 'TODO' }) {
  await page.getByTestId('new-issue-btn').click();
  await page.getByTestId('issue-title-input').fill(title);
  await page.getByTestId('issue-priority-input').selectOption(priority);
  await page.getByTestId('issue-status-input').selectOption(status);
  await page.getByTestId('issue-save').click();
  await page.getByTestId('issue-modal').waitFor({ state: 'detached' });
}

test.describe('Issues', () => {
  test('UI-13 create issue appears in the table', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Login button broken' });
    await expect(page.getByTestId('issue-table')).toContainText('Login button broken');
  });

  test('UI-14 create issue requires a title', async ({ page }) => {
    await setup(page);
    await page.getByTestId('new-issue-btn').click();
    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('issue-title-error')).toBeVisible();
  });

  test('UI-15 edit issue updates the title', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Old title' });
    await page.getByTestId('issue-title').first().click();
    await page.getByTestId('issue-title-input').fill('Updated title');
    await page.getByTestId('issue-save').click();
    await expect(page.getByTestId('issue-table')).toContainText('Updated title');
  });

  test('UI-16 change status via inline select persists', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Status flow', status: 'TODO' });
    await page.getByTestId('status-select').first().selectOption('IN_PROGRESS');
    await page.reload();
    await expect(page.getByTestId('status-select').first()).toHaveValue('IN_PROGRESS');
  });

  test('UI-17 delete issue removes it from the table', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Delete me' });
    page.on('dialog', (d) => d.accept());
    await page.getByTestId('delete-issue-btn').first().click();
    await expect(page.getByTestId('issues-empty')).toBeVisible();
  });

  test('UI-18 filter by status narrows the list', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Todo item', status: 'TODO' });
    await createIssue(page, { title: 'Done item', status: 'DONE' });
    await page.getByTestId('filter-status').selectOption('DONE');
    await expect(page.getByTestId('issue-table')).toContainText('Done item');
    await expect(page.getByTestId('issue-table')).not.toContainText('Todo item');
  });

  test('UI-19 filter by priority narrows the list', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Critical bug', priority: 'CRITICAL' });
    await createIssue(page, { title: 'Low chore', priority: 'LOW' });
    await page.getByTestId('filter-priority').selectOption('CRITICAL');
    await expect(page.getByTestId('issue-table')).toContainText('Critical bug');
    await expect(page.getByTestId('issue-table')).not.toContainText('Low chore');
  });

  test('UI-20 search by title filters matching issues', async ({ page }) => {
    await setup(page);
    await createIssue(page, { title: 'Payment gateway timeout' });
    await createIssue(page, { title: 'Navbar alignment' });
    await page.getByTestId('filter-title').fill('payment');
    await expect(page.getByTestId('issue-table')).toContainText('Payment gateway timeout');
    await expect(page.getByTestId('issue-table')).not.toContainText('Navbar alignment');
  });

  test('UI-21 dashboard open/completed counts update with issues', async ({ page }) => {
    await setup(page, 'Counts Project');
    await createIssue(page, { title: 'Open one', status: 'TODO' });
    await createIssue(page, { title: 'Done one', status: 'DONE' });
    await page.getByTestId('back-dashboard').click();
    await expect(page.getByTestId('stat-open')).toContainText('1');
    await expect(page.getByTestId('stat-completed')).toContainText('1');
    await expect(page.getByTestId('stat-issues')).toContainText('2');
  });
});
