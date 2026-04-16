import { expect, Page } from '@playwright/test'

/**
 * Sign in with the demo admin account and wait for the dashboard to render.
 *
 * The login form's labels aren't associated to inputs via htmlFor, so we
 * target the inputs by type instead (more robust, framework-agnostic).
 */
export async function login(
  page: Page,
  email = 'demo@vexa.app',
  password = 'demo2026!'
) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: /^(Sign in|Iniciar sesión|\.\.\.)$/ }).click()
  await expect(
    page.getByRole('heading', { name: /(Welcome|Bienvenido)/, level: 1 })
  ).toBeVisible({ timeout: 20_000 })
}
