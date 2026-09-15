import { test, expect } from '@playwright/test';

test('audit opens visibly, shows raw rows, filters, and restores focus', async ({ page }) => {
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Inspect row-level audit' });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Row-level audit' })).toBeVisible();
  await expect(dialog.locator('tbody tr')).toHaveCount(12);
  await page.getByLabel('Filter audit rows').selectOption('duplicate_removed');
  await expect(dialog.locator('tbody tr')).toHaveCount(1);
  await expect(dialog.getByText('#1001')).toBeVisible();
  await page.getByLabel('Filter audit rows').selectOption('missing_revenue');
  await expect(dialog.getByText('#1004')).toBeVisible();
  await dialog.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(dialog.getByRole('cell', { name: '(blank)', exact: true })).toBeVisible();
  await page.getByLabel('Filter audit rows').selectOption('all');
  await page.getByLabel('Search audit rows').fill('1003');
  await expect(dialog.getByRole('cell', { name: 'W', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cleaned', exact: true }).click();
  await expect(dialog.getByRole('cell', { name: 'West', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'View calculations' }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Done inspecting' }).click();
  await expect(dialog).not.toBeVisible();
});

test('chart selectors, donut, CSV export, and all totals work', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export view' })).toBeEnabled();
  await expect(page.locator('tfoot')).toContainText('$9,045.75');
  await page.getByLabel('Break down by').selectOption('category');
  await expect(page.locator('tfoot')).toContainText('$9,045.75');
  await expect(page.locator('.bar-label').first()).toContainText('Furniture');
  await page.getByRole('button', { name: 'Donut', exact: true }).click();
  await expect(page.locator('.donut-visual svg')).toBeVisible();
  await page.getByLabel('Measure', { exact: true }).selectOption('orders');
  await expect(page.locator('tfoot td').nth(1)).toHaveText('11');
  await expect(page.locator('.chart-footer')).toContainText('All unique orders');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export view' }).click();
  expect((await download).suggestedFilename()).toBe('orders-category-orders.csv');
});

test('loading skeleton and API failure support retry', async ({ page }) => {
  let finishRequest: () => void = () => {};
  const held = new Promise<void>(resolve => { finishRequest = resolve; });
  await page.route('**/api/aggregate?**', async route => { await held; await route.fulfill({ status: 503, body: '{}' }); });
  await page.goto('/');
  await expect(page.getByText('Loading chart', { exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Inspect row-level audit' })).toBeDisabled();
  finishRequest();
  await expect(page.getByRole('alert').filter({ hasText: 'Let’s try that again' })).toBeVisible();
  await page.unroute('**/api/aggregate?**');
  await page.getByRole('button', { name: 'Retry loading' }).click();
  await expect(page.getByRole('button', { name: 'Inspect row-level audit' })).toBeEnabled();
});

test('desktop and mobile layouts, audit, and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Inspect row-level audit' })).toBeEnabled();
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Inspect row-level audit' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'test-results/audit-mobile.png', animations: 'disabled' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.locator('.audit-dialog').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  await page.getByRole('button', { name: 'Close row-level audit' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
