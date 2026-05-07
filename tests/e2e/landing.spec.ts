import { test, expect } from '@playwright/test'

test.describe('Landing page (/welcome)', () => {
  test('loads and shows hero + nav + demo form', async ({ page }) => {
    await page.goto('/welcome')

    await expect(
      page.getByRole('heading', {
        name: /(From hours to collection, no spreadsheets|De las horas al cobro, sin planillas)/,
      })
    ).toBeVisible()

    // Sign-in CTA in header.
    await expect(
      page.getByRole('link', { name: /^(Sign in|Ingresar)$/ }).first()
    ).toBeVisible()

    // Demo form section exists (even if not in viewport yet).
    await expect(page.locator('#contact')).toHaveCount(1)
    await expect(page.locator('#contact select')).toHaveCount(1)
  })

  test('sign-in CTA navigates to /login', async ({ page }) => {
    await page.goto('/welcome')
    await page.getByRole('link', { name: /^(Sign in|Ingresar)$/ }).first().click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('no references to removed "timer" copy', async ({ page }) => {
    await page.goto('/welcome')
    const body = (await page.textContent('body')) || ''
    expect(body).not.toMatch(/cronómetro integrado/i)
    expect(body).not.toMatch(/built-in timer/i)
  })
})
