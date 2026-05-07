import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Dashboard shell + navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('dashboard renders 4 stat cards', async ({ page }) => {
    const cards = page.locator('main div.grid.grid-cols-2.lg\\:grid-cols-4 > div')
    await expect(cards).toHaveCount(4)
  })

  test('navigates through each module without unhandled errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
    })

    for (const path of ['/clients', '/time', '/expenses', '/timesheets', '/stats', '/users', '/settings']) {
      await page.goto(path)
      await expect(page.locator('main')).toBeVisible()
      await expect(page.locator('body')).not.toContainText(/Something went wrong|Algo salió mal/)
    }

    // Filter out benign dev-server / CDN noise.
    const realErrors = errors.filter(
      (m) => !/favicon|hydrat|Fast Refresh|net::ERR_ABORTED|Failed to load resource/i.test(m)
    )
    expect(realErrors, `Browser errors: ${realErrors.join('\n')}`).toEqual([])
  })

  test('stats page: admin sees By Lawyer / By Matter / Partner Efficiency tabs', async ({ page }) => {
    await page.goto('/stats')
    await expect(page.getByRole('button', { name: /By lawyer|Por abogado/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /By matter|Por asunto/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Partner efficiency|Rendimiento socios/ })).toBeVisible()
  })

  test('timesheets page: has View / Create tabs', async ({ page }) => {
    await page.goto('/timesheets')
    await expect(page.getByRole('button', { name: /^(View|Ver)$/ }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^(Create|Crear)$/ }).first()).toBeVisible()
  })

  test('time page renders calendar + entry form (no timer UI)', async ({ page }) => {
    await page.goto('/time')
    await expect(page.locator('main')).toBeVisible()
    const bodyText = (await page.textContent('body')) || ''
    expect(bodyText).not.toMatch(/start timer|iniciar cronómetro/i)
  })
})
