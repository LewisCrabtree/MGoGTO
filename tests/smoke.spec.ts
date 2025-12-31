import { test, expect } from '@playwright/test';

test('has title and board', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await expect(page).toHaveTitle(/MGo GTO/);
  
  // Check if the board is visible
  const board = page.locator('.board');
  await expect(board).toBeVisible();
  
  // Check if the GO space is there
  const goSpace = page.locator('.space.go');
  await expect(goSpace).toContainText('GO');
  
  // Click space 7
  const space7 = page.locator('button', { hasText: /^7$/ });
  await space7.click();
  
  // Check if probability updated (7 is 16.7%)
  const prob = page.locator('.center h2');
  await expect(prob).toContainText('16.7%');
});
