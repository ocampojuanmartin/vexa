import { test, expect } from '@playwright/test'
import { login } from './helpers'

/**
 * Schema regression: these tests protect the v6 DB fixes against accidental
 * rollback by reading a few signals from the UI.
 */

test.describe('v6 schema regressions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('timesheet status filter contains "Issued / Emitido"', async ({ page }) => {
    await page.goto('/timesheets')
    // The status filter select contains one option per enum value.
    const statusSelect = page.locator('select').filter({ hasText: /Draft|Borrador/ }).first()
    await expect(statusSelect).toBeVisible()
    const optionsText = await statusSelect.locator('option').allTextContents()
    expect(optionsText.some((t) => /Issued|Emitido/.test(t))).toBeTruthy()
  })

  test('matter status dropdown excludes "intake"', async ({ page }) => {
    await page.goto('/clients')
    const html = await page.content()
    // clients/page.tsx STATUSES is ['active','suspended','closed'] — no intake option.
    expect(html).not.toMatch(/<option[^>]+value="intake"/)
  })
})
