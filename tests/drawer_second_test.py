"""
Header.astro ハンバーガードロワー二次テスト
さき指示の playbook に沿って モバイル 375x800 で各ケースを実機検証する。

実行: python tests/drawer_second_test.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = "http://localhost:4321"
SHOT_DIR = Path(__file__).parent / "screenshots"
VIDEO_DIR = Path(__file__).parent / "videos"
SHOT_DIR.mkdir(exist_ok=True)
VIDEO_DIR.mkdir(exist_ok=True)

VIEWPORT = {"width": 375, "height": 800}

results: list[tuple[str, str, str]] = []  # (case, pass/fail, note)


def record(case: str, ok: bool, note: str = "") -> None:
    results.append((case, "PASS" if ok else "FAIL", note))
    print(f"[{'PASS' if ok else 'FAIL'}] {case} {('- ' + note) if note else ''}")


def run() -> int:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            record_video_dir=str(VIDEO_DIR),
            record_video_size=VIEWPORT,
        )
        page = context.new_page()

        try:
            page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
        except PlaywrightTimeoutError:
            print(f"FATAL: cannot reach {BASE_URL}")
            return 2

        # 念のため初期描画完了待ち
        page.wait_for_selector("[data-nav-toggle]", timeout=5000)
        time.sleep(0.3)

        # =========================================================
        # Case A: スクロール前 ハンバーガー開閉
        # =========================================================
        print("\n=== Case A: 開閉 (no scroll) ===")
        # 開く
        page.click("[data-nav-toggle]")
        time.sleep(0.5)  # transition 0.3s 待ち
        is_open = page.evaluate("document.querySelector('[data-nav]').classList.contains('is-open')")
        record("A1-open-state", is_open, f"is-open={is_open}")
        page.screenshot(path=str(SHOT_DIR / "open_no_scroll.png"), full_page=False)
        print(f"  shot: {SHOT_DIR / 'open_no_scroll.png'}")

        # ドロワー背景色 / backdrop 透過確認
        nav_bg = page.evaluate(
            "getComputedStyle(document.querySelector('.site-nav')).backgroundColor"
        )
        backdrop_visible = page.evaluate(
            "getComputedStyle(document.querySelector('[data-nav-backdrop]')).visibility"
        )
        backdrop_opacity = page.evaluate(
            "getComputedStyle(document.querySelector('[data-nav-backdrop]')).opacity"
        )
        record(
            "A2-drawer-bg-white",
            nav_bg in ("rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"),
            f"nav bg={nav_bg}",
        )
        record(
            "A3-backdrop-visible",
            backdrop_visible == "visible" and float(backdrop_opacity) > 0.4,
            f"vis={backdrop_visible} opacity={backdrop_opacity}",
        )

        # 左 14% 領域に backdrop が居るか (viewport 375 * 0.14 = 約 52px)
        # 左端 20px,中央高さ でクリックして backdrop が反応するか確認 → 閉じる
        # 背景クリックで閉じる
        page.mouse.click(20, 400)
        time.sleep(0.4)
        is_closed = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("A4-backdrop-click-close", is_closed, f"closed={is_closed}")
        page.screenshot(path=str(SHOT_DIR / "closed_no_scroll.png"), full_page=False)
        print(f"  shot: {SHOT_DIR / 'closed_no_scroll.png'}")

        # =========================================================
        # Case B: スクロール後 ハンバーガー開閉
        # =========================================================
        print("\n=== Case B: 開閉 (scrolled 200px) ===")
        page.evaluate("window.scrollTo(0, 200)")
        time.sleep(0.4)
        is_scrolled = page.evaluate(
            "document.querySelector('[data-header]').classList.contains('is-scrolled')"
        )
        record("B1-header-is-scrolled", is_scrolled, f"is-scrolled={is_scrolled}")

        # 開く前 (はみだしチェック用) と 開く瞬間を細かく連続スクショして「右上に細く」が出ないか確認
        page.screenshot(path=str(SHOT_DIR / "B_before_open.png"))

        # クリックして 連続キャプチャ
        page.click("[data-nav-toggle]")
        # 約 50ms ごとに 6 枚
        for i in range(6):
            time.sleep(0.05)
            page.screenshot(path=str(SHOT_DIR / f"B_anim_{i:02d}.png"))
        # transition 完了まで待ち
        time.sleep(0.5)

        is_open2 = page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("B2-open-state", is_open2, f"is-open={is_open2}")

        nav_bg2 = page.evaluate(
            "getComputedStyle(document.querySelector('.site-nav')).backgroundColor"
        )
        record(
            "B3-drawer-bg-white",
            nav_bg2 in ("rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"),
            f"nav bg={nav_bg2}",
        )

        # header の transition / backdrop-filter が body:has(...) で切れているか
        header_trans = page.evaluate(
            "getComputedStyle(document.querySelector('[data-header]')).transition"
        )
        header_bd_filter = page.evaluate(
            "getComputedStyle(document.querySelector('[data-header]')).backdropFilter"
        )
        record(
            "B4-header-trans-none",
            header_trans.startswith("all 0s") or header_trans == "none 0s ease 0s" or "0s" in header_trans,
            f"trans={header_trans}",
        )
        record(
            "B5-header-backdrop-none",
            header_bd_filter in ("none", ""),
            f"backdrop-filter={header_bd_filter}",
        )

        page.screenshot(path=str(SHOT_DIR / "open_scrolled.png"))
        print(f"  shot: {SHOT_DIR / 'open_scrolled.png'}")

        # 背景クリックで閉じる
        page.mouse.click(20, 400)
        time.sleep(0.4)
        is_closed2 = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("B6-backdrop-click-close", is_closed2, f"closed={is_closed2}")
        page.screenshot(path=str(SHOT_DIR / "closed_scrolled.png"))
        print(f"  shot: {SHOT_DIR / 'closed_scrolled.png'}")

        # =========================================================
        # Case C: メニュー項目クリック
        # =========================================================
        print("\n=== Case C: メニュー項目クリック ===")
        # スクロール戻し
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(0.3)
        page.click("[data-nav-toggle]")
        time.sleep(0.5)
        record(
            "C1-reopen",
            page.evaluate(
                "document.querySelector('[data-nav]').classList.contains('is-open')"
            ),
        )
        # About を直接クリック
        page.click(".site-nav a[href='#about']")
        time.sleep(0.6)  # 閉じ + アンカー遷移
        c_closed = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        c_hash = page.evaluate("location.hash")
        record("C2-menu-click-close", c_closed, f"closed={c_closed} hash={c_hash}")
        record("C3-anchor-jumped", c_hash == "#about", f"hash={c_hash}")

        # =========================================================
        # Case D: ESC で閉じる (追加保険テスト)
        # =========================================================
        print("\n=== Case D: ESC で閉じる ===")
        page.click("[data-nav-toggle]")
        time.sleep(0.4)
        page.keyboard.press("Escape")
        time.sleep(0.4)
        d_closed = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("D1-esc-close", d_closed, f"closed={d_closed}")

        # 動画を確実に保存させる
        video = page.video
        page.close()
        context.close()
        browser.close()

        if video is not None:
            try:
                video_path = video.path()
                print(f"\nvideo: {video_path}")
            except Exception as e:
                print(f"video save error: {e}")

        # 結果サマリ
        print("\n========== SUMMARY ==========")
        n_fail = sum(1 for _, r, _ in results if r == "FAIL")
        for case, r, note in results:
            print(f"  [{r}] {case}  {note}")
        print(f"\nTotal: {len(results)}, FAIL: {n_fail}")
        return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
