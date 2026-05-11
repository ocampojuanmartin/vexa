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

  test('showcase section: 3 numbered screenshot rows render with browser-chrome frames', async ({ page }) => {
    await page.goto('/welcome')
    // Section header
    await expect(
      page.getByRole('heading', { name: /three screens|tres pantallas|one complete flow|un flujo completo/i })
    ).toBeVisible()
    // 3 ordinals
    const section = page.locator('section#showcase')
    await expect(section.getByText('01', { exact: true })).toBeVisible()
    await expect(section.getByText('02', { exact: true })).toBeVisible()
    await expect(section.getByText('03', { exact: true })).toBeVisible()
    // 3 screenshot images (PNG with SVG fallback) — present in the DOM.
    const imgs = section.locator('img')
    await expect(imgs).toHaveCount(3)
    // Sources match the convention so future renames trip the test on purpose.
    const srcs = await imgs.evaluateAll((els: Element[]) =>
      els.map((el) => (el as HTMLImageElement).getAttribute('src') || '')
    )
    expect(srcs[0]).toMatch(/\/screenshots\/01-time\.(png|svg)$/)
    expect(srcs[1]).toMatch(/\/screenshots\/02-timesheet\.(png|svg)$/)
    expect(srcs[2]).toMatch(/\/screenshots\/03-stats\.(png|svg)$/)
  })
})
