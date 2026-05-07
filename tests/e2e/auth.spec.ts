import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Auth flow (login → dashboard → logout)', () => {
  test('login with demo admin + land on dashboard', async ({ page }) => {
    await login(page)
    // Expect the 4 stat cards to render.
    await expect(
      page.locator('main div.grid.grid-cols-2.lg\\:grid-cols-4 > div')
    ).toHaveCount(4)
  })

  test('/ redirects unauthenticated users to /login', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
    await ctx.close()
  })

  test('/welcome is accessible without auth', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto('/welcome')
    await expect(page).toHaveURL(/\/welcome$/)
    await expect(
      page.getByRole('heading', {
        name: /(From hours to collection|De las horas al cobro)/,
      })
    ).toBeVisible()
    await ctx.close()
  })
})
