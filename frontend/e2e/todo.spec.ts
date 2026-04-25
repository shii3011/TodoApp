import { test, expect, type Page } from '@playwright/test'

// ─────────────────────────────────────────────
// ヘルパー
// ─────────────────────────────────────────────
async function openForm(page: Page) {
  const btn = page.getByRole('button', { name: '＋ 新しいTODO' })
  if (await btn.isVisible()) await btn.click()
}

// テストごとに一意なタイトルを生成（前回実行の残留データと衝突しないため）
function uid() {
  return Date.now().toString(36)
}

// ─────────────────────────────────────────────
// 基本 CRUD フロー
// ─────────────────────────────────────────────
test.describe('TODO 基本操作', () => {
  test('TODO を作成できる', async ({ page }) => {
    const title = `E2E作成確認-${uid()}`
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill(title)
    await page.getByRole('button', { name: '追加する' }).click()

    await expect(page.getByText(title)).toBeVisible()
  })

  test('完了トグルで完了状態になる', async ({ page }) => {
    const title = `E2E完了トグル-${uid()}`
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill(title)
    await page.getByRole('button', { name: '追加する' }).click()

    const card = page.locator('li', { hasText: title }).first()
    await card.locator('label').first().click()

    // 完了済みフィルターで表示されることを確認
    await page.locator('select').first().selectOption('completed')
    await expect(page.getByText(title)).toBeVisible()
  })

  test('TODO を削除できる', async ({ page }) => {
    const title = `E2E削除確認-${uid()}`
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill(title)
    await page.getByRole('button', { name: '追加する' }).click()
    await expect(page.getByText(title)).toBeVisible()

    // 削除ボタンをクリック（hover で opacity: 0 → 1 になってからクリック）
    const card = page.locator('li', { hasText: title }).first()
    await card.hover()
    await card.getByTitle('削除').click()

    await expect(page.getByText(title)).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────
// バリデーション
// ─────────────────────────────────────────────
test.describe('TODO バリデーション', () => {
  test('タイトル未入力では追加ボタンが無効', async ({ page }) => {
    await page.goto('/')
    await openForm(page)

    // タイトルを入力しない状態で追加ボタンは disabled
    await expect(page.getByRole('button', { name: '追加する' })).toBeDisabled()
  })

  test('タイトルを入力すると追加ボタンが有効になる', async ({ page }) => {
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill('a')
    await expect(page.getByRole('button', { name: '追加する' })).toBeEnabled()
  })
})

// ─────────────────────────────────────────────
// フィルター・検索
// ─────────────────────────────────────────────
test.describe('フィルター・検索', () => {
  test('検索ワードで絞り込みできる', async ({ page }) => {
    const title = `E2E検索テスト-${uid()}`
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill(title)
    await page.getByRole('button', { name: '追加する' }).click()
    await expect(page.getByText(title)).toBeVisible()

    await page.getByPlaceholder('タイトル・詳細を検索...').fill(title)
    await expect(page.getByText(title)).toBeVisible()

    // 関係ないワードで検索すると見えなくなる
    await page.getByPlaceholder('タイトル・詳細を検索...').fill('xyzxyzxyz存在しない')
    await expect(page.getByText(title)).not.toBeVisible()
  })

  test('未完了フィルターで完了済みTODOが非表示になる', async ({ page }) => {
    const title = `E2Eフィルターテスト-${uid()}`
    await page.goto('/')
    await openForm(page)

    await page.getByPlaceholder('タイトル *').fill(title)
    await page.getByRole('button', { name: '追加する' }).click()

    const card = page.locator('li', { hasText: title }).first()
    await card.locator('label').first().click()

    await page.locator('select').first().selectOption('active')
    await expect(page.getByText(title)).not.toBeVisible()
  })
})
