import {test, expect, openHome} from './fixtures.mjs';

// The footer is fully translated, and says the English index is checked daily even when its last change is older.
test.use({locale: 'en-US', timezoneId: 'America/New_York'});

test('the footer shows when the index last changed, that it is checked daily, and the iPhone tip in English', async ({page}) => {
  await openHome(page);
  const footer = page.locator('footer');
  await expect(footer).toContainText(/English index: updated \d{1,2}\/\d{1,2}\/\d{4}, checked daily · Other card languages: fetched live/);
  await expect(footer).toContainText('iPhone: Share → Add to Home Screen');
  await expect(footer).not.toContainText('beginscherm');
});
