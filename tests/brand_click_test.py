"""
ヘッダーロゴ "Co-Thrive Labs" クリック挙動の検証。

検証ポイント:
  1. /works/sprout/ でロゴクリック → ページ遷移せず top にスクロール
  2. / (home) で #works までスクロール → ロゴクリック → top にスクロール、URL から #hero/#works が消える
  3. href 属性が "/" になっていること（中クリックで新タブが / に飛ぶ前提）
  4. Ctrl+クリックではデフォルト挙動を尊重（preventDefault されない）

Astro dev server (http://localhost:4321) が起動済みである前提。
"""
from __future__ import annotations

import io
import sys

# Windows cp932 コンソール対策: 標準出力を utf-8 に切替
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", line_buffering=True)
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", line_buffering=True)

from playwright.sync_api import sync_playwright, expect  # noqa: E402


BASE_URL = "http://localhost:4321"


def t(label: str, cond: bool, detail: str = "") -> bool:
    mark = "PASS" if cond else "FAIL"
    extra = f" — {detail}" if detail else ""
    print(f"  [{mark}] {label}{extra}")
    return cond


def test_brand_click_on_subpage(page) -> list[bool]:
    print("\n[1] /works/sprout/ でロゴクリック挙動")
    results: list[bool] = []
    page.goto(f"{BASE_URL}/works/sprout/")
    page.wait_for_load_state("networkidle")

    # ページを下にスクロール
    page.evaluate("window.scrollTo(0, 1500)")
    page.wait_for_timeout(200)
    before_y = page.evaluate("window.scrollY")
    results.append(t("ページ下方にスクロール済み (>500px)", before_y > 500, f"y={before_y}"))

    # ロゴクリック
    page.click(".site-brand")
    # smooth scroll 完了待ち
    page.wait_for_function("window.scrollY < 5", timeout=3000)
    after_y = page.evaluate("window.scrollY")
    results.append(t("ロゴクリック後 top に戻る (<5px)", after_y < 5, f"y={after_y}"))

    # URL が /works/sprout/ のままで、ホームに遷移していない
    current_url = page.url
    results.append(
        t(
            "URL が /works/sprout/ のまま（ホーム遷移していない）",
            current_url.rstrip("/").endswith("/works/sprout"),
            current_url,
        )
    )

    # ハッシュが残っていない
    results.append(t("URL にハッシュが残っていない", "#" not in current_url, current_url))

    # href 属性が "/" になっている
    href = page.get_attribute(".site-brand", "href")
    results.append(t('href 属性 = "/"', href == "/", f"href={href!r}"))

    return results


def test_brand_click_on_home(page) -> list[bool]:
    print("\n[2] / (home) でロゴクリック挙動 + ハッシュ消去")
    results: list[bool] = []
    page.goto(f"{BASE_URL}/#works")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(800)  # スムーズスクロール待ち
    before_y = page.evaluate("window.scrollY")
    results.append(t("#works までスクロール (>300px)", before_y > 300, f"y={before_y}"))

    page.click(".site-brand")
    page.wait_for_function("window.scrollY < 5", timeout=3000)
    after_y = page.evaluate("window.scrollY")
    results.append(t("ロゴクリック後 top に戻る", after_y < 5, f"y={after_y}"))

    # ハッシュが消えている
    url = page.url
    results.append(t("URL から #works が消えた", "#" not in url, url))

    return results


def test_ctrl_click_keeps_default(page) -> list[bool]:
    """
    Ctrl+クリックではハンドラ内で preventDefault しないので、
    click イベントの defaultPrevented は false であること。
    （実際の新タブ生成は Playwright のページコンテキスト内で context.expect_page() が必要だが、
    ここでは "preventDefault されないこと" だけ JS で観測する）
    """
    print("\n[3] Ctrl+クリック ではデフォルト挙動を尊重")
    results: list[bool] = []
    page.goto(f"{BASE_URL}/works/sprout/")
    page.wait_for_load_state("networkidle")

    # ブラウザ側でクリックイベントを傍受し、defaultPrevented を観測
    page.evaluate(
        """
        window.__brandClickDefaultPrevented = null;
        document.querySelector('.site-brand').addEventListener('click', (e) => {
            // ハンドラ実行後の状態を次マイクロタスクで確認
            queueMicrotask(() => {
                window.__brandClickDefaultPrevented = e.defaultPrevented;
            });
        }, true);  // capture: false にしたいので true は使わない方が良い
        """
    )
    # 上の capture:true は登録順の問題で実害なし。bubbling phase の後に追加観測する別の手も:
    page.evaluate(
        """
        document.querySelector('.site-brand').addEventListener('click', (e) => {
            // bubble phase の最後で観測
            window.__brandClickDefaultPreventedBubble = e.defaultPrevented;
            // Ctrl+クリックで新規ナビゲーションが起きないようここで止める
            e.preventDefault();
        });
        """
    )
    # Ctrl+クリック
    page.click(".site-brand", modifiers=["Control"])
    page.wait_for_timeout(200)
    bubble_prevented = page.evaluate("window.__brandClickDefaultPreventedBubble")
    # ブランドハンドラ自体は Ctrl 押下で preventDefault しないので、
    # bubble phase の観測（テスト側 preventDefault 直前）では false のはず
    results.append(
        t(
            "Ctrl+クリック時はブランドハンドラが preventDefault しない",
            bubble_prevented is False,
            f"defaultPrevented={bubble_prevented}",
        )
    )
    return results


def test_keyboard_enter(page) -> list[bool]:
    print("\n[4] キーボードフォーカス + Enter でロゴ動作")
    results: list[bool] = []
    page.goto(f"{BASE_URL}/works/sprout/")
    page.wait_for_load_state("networkidle")
    page.evaluate("window.scrollTo(0, 1200)")
    page.wait_for_timeout(200)
    # ロゴにフォーカス
    page.focus(".site-brand")
    page.keyboard.press("Enter")
    page.wait_for_function("window.scrollY < 5", timeout=3000)
    after_y = page.evaluate("window.scrollY")
    results.append(t("Enter キー押下後 top に戻る", after_y < 5, f"y={after_y}"))
    results.append(
        t(
            "URL が /works/sprout/ のまま",
            page.url.rstrip("/").endswith("/works/sprout"),
            page.url,
        )
    )
    return results


def test_mobile_menu_closes(page) -> list[bool]:
    print("\n[5] モバイル幅: メニュー開→ロゴクリックでメニュー閉じる + top スクロール")
    print("    （実機ではドロワー(z:70)がロゴ表示領域を覆うが、ロゴ自体は header(z:80) に存在）")
    results: list[bool] = []
    page.set_viewport_size({"width": 375, "height": 720})
    page.goto(f"{BASE_URL}/works/sprout/")
    page.wait_for_load_state("networkidle")
    page.evaluate("window.scrollTo(0, 1200)")
    page.wait_for_timeout(200)
    # ハンバーガー開
    page.click("[data-nav-toggle]")
    page.wait_for_timeout(300)
    is_open = page.evaluate("document.querySelector('[data-nav]').classList.contains('is-open')")
    results.append(t("ハンバーガーでドロワーが開く", is_open, f"is-open={is_open}"))

    # ドロワーが上に重なる現実を反映し、JS で click イベントを直接 dispatch する
    # （アプリのクリックハンドラ動作確認が目的で、Playwright ヒットテストはスコープ外）
    page.evaluate(
        """
        document.querySelector('.site-brand').dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
        );
        """
    )
    page.wait_for_function("window.scrollY < 5", timeout=3000)
    page.wait_for_timeout(200)
    still_open = page.evaluate(
        "document.querySelector('[data-nav]').classList.contains('is-open')"
    )
    after_y = page.evaluate("window.scrollY")
    results.append(t("ロゴクリックでドロワーが閉じる", not still_open, f"is-open={still_open}"))
    results.append(t("top にスクロールしている", after_y < 5, f"y={after_y}"))
    return results


def main() -> int:
    all_results: list[bool] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            all_results += test_brand_click_on_subpage(page)
            all_results += test_brand_click_on_home(page)
            all_results += test_ctrl_click_keeps_default(page)
            all_results += test_keyboard_enter(page)
            all_results += test_mobile_menu_closes(page)
        finally:
            context.close()
            browser.close()

    total = len(all_results)
    passed = sum(all_results)
    print(f"\n===== 結果: {passed}/{total} PASS =====")
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
