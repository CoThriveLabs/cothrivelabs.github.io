"""
Header.astro ハンバーガードロワー 三次テスト (z-index 修正後)
さき指示の playbook に沿って モバイル 375x800 で各ケースを実機検証する。
追加: z-order スタック (elementsFromPoint) 検査・ABOUT クリックでハッシュ遷移確認

実行: python tests/drawer_third_test.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

BASE_URL = "http://localhost:4321"
SHOT_DIR = Path(__file__).parent.parent / "test-screenshots" / "round3"
VIDEO_DIR = Path(__file__).parent / "videos"
SHOT_DIR.mkdir(parents=True, exist_ok=True)
VIDEO_DIR.mkdir(exist_ok=True)

VIEWPORT = {"width": 375, "height": 800}

results: list[tuple[str, str, str]] = []


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

        page.wait_for_selector("[data-nav-toggle]", timeout=5000)
        time.sleep(0.3)

        # =========================================================
        # Case A: スクロール前 ハンバーガー開閉
        # =========================================================
        print("\n=== Case A: 開閉 (no scroll) ===")
        page.click("[data-nav-toggle]")
        time.sleep(0.5)
        is_open = page.evaluate("document.querySelector('[data-nav]').classList.contains('is-open')")
        record("A1-open-state", is_open, f"is-open={is_open}")
        page.screenshot(path=str(SHOT_DIR / "open_no_scroll.png"), full_page=False)
        print(f"  shot: {SHOT_DIR / 'open_no_scroll.png'}")

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

        # ===== z-order 検査 (ABOUT 中央座標で elementsFromPoint) =====
        about_box = page.evaluate(
            """() => {
                const a = document.querySelector(".site-nav a[href='/#about']");
                if(!a) return null;
                const r = a.getBoundingClientRect();
                return {x: r.x + r.width/2, y: r.y + r.height/2, w: r.width, h: r.height};
            }"""
        )
        if about_box is None:
            record("A4-zorder-stack", False, "about anchor not found")
        else:
            stack = page.evaluate(
                f"""() => {{
                    const els = document.elementsFromPoint({about_box['x']}, {about_box['y']});
                    return els.slice(0, 6).map(e => {{
                        const cs = getComputedStyle(e);
                        return {{
                            tag: e.tagName.toLowerCase(),
                            id: e.id || '',
                            cls: e.className && e.className.baseVal !== undefined ? e.className.baseVal : (e.className || ''),
                            text: (e.textContent || '').trim().slice(0,20),
                            z: cs.zIndex,
                            pos: cs.position
                        }};
                    }});
                }}"""
            )
            print(f"  z-stack at ABOUT ({about_box['x']:.0f},{about_box['y']:.0f}):")
            for i, e in enumerate(stack):
                print(f"    [{i}] <{e['tag']}> cls='{e['cls']}' text='{e['text']}' z={e['z']} pos={e['pos']}")
            top_is_anchor = (
                stack[0]["tag"] == "a"
                or (stack[0]["tag"] == "span" and len(stack) > 1 and stack[1]["tag"] == "a")
            )
            record(
                "A4-zorder-top-is-anchor",
                top_is_anchor,
                f"top=<{stack[0]['tag']}> cls={stack[0]['cls'][:30]}",
            )

        # 背景クリックで閉じる (左 20px, 中央)
        page.mouse.click(20, 400)
        time.sleep(0.4)
        is_closed = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("A5-backdrop-click-close", is_closed, f"closed={is_closed}")
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

        page.screenshot(path=str(SHOT_DIR / "B_before_open.png"))

        page.click("[data-nav-toggle]")
        for i in range(6):
            time.sleep(0.05)
            page.screenshot(path=str(SHOT_DIR / f"B_anim_{i:02d}.png"))
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

        header_trans = page.evaluate(
            "getComputedStyle(document.querySelector('[data-header]')).transition"
        )
        header_bd_filter = page.evaluate(
            "getComputedStyle(document.querySelector('[data-header]')).backdropFilter"
        )
        header_z = page.evaluate(
            "getComputedStyle(document.querySelector('[data-header]')).zIndex"
        )
        record(
            "B4-header-trans-none",
            header_trans in ("none", "all 0s ease 0s", "none 0s ease 0s") or "0s" in header_trans,
            f"trans={header_trans}",
        )
        record(
            "B5-header-backdrop-none",
            header_bd_filter in ("none", ""),
            f"backdrop-filter={header_bd_filter}",
        )
        record(
            "B6-header-z-80",
            header_z == "80",
            f"z-index={header_z}",
        )

        page.screenshot(path=str(SHOT_DIR / "open_scrolled.png"))
        print(f"  shot: {SHOT_DIR / 'open_scrolled.png'}")

        # ===== z-order (スクロール後) =====
        about_box2 = page.evaluate(
            """() => {
                const a = document.querySelector(".site-nav a[href='/#about']");
                if(!a) return null;
                const r = a.getBoundingClientRect();
                return {x: r.x + r.width/2, y: r.y + r.height/2};
            }"""
        )
        if about_box2:
            stack2 = page.evaluate(
                f"""() => {{
                    const els = document.elementsFromPoint({about_box2['x']}, {about_box2['y']});
                    return els.slice(0, 6).map(e => ({{
                        tag: e.tagName.toLowerCase(),
                        cls: e.className && e.className.baseVal !== undefined ? e.className.baseVal : (e.className || ''),
                        text: (e.textContent || '').trim().slice(0,20),
                        z: getComputedStyle(e).zIndex
                    }}));
                }}"""
            )
            print(f"  z-stack (scrolled) at ABOUT:")
            for i, e in enumerate(stack2):
                print(f"    [{i}] <{e['tag']}> cls='{e['cls']}' text='{e['text']}' z={e['z']}")
            top_is_anchor2 = (
                stack2[0]["tag"] == "a"
                or (stack2[0]["tag"] == "span" and len(stack2) > 1 and stack2[1]["tag"] == "a")
            )
            record(
                "B7-zorder-top-is-anchor",
                top_is_anchor2,
                f"top=<{stack2[0]['tag']}>",
            )

        # 背景クリックで閉じる
        page.mouse.click(20, 400)
        time.sleep(0.4)
        is_closed2 = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        record("B8-backdrop-click-close", is_closed2, f"closed={is_closed2}")
        page.screenshot(path=str(SHOT_DIR / "closed_scrolled.png"))

        # =========================================================
        # Case C (重点): ABOUT クリックで hash 遷移
        # =========================================================
        print("\n=== Case C: ABOUT クリックで hash=#about ===")
        page.evaluate("window.scrollTo(0, 0); history.replaceState(null,'',location.pathname);")
        time.sleep(0.3)
        page.click("[data-nav-toggle]")
        time.sleep(0.5)
        record(
            "C1-reopen",
            page.evaluate("document.querySelector('[data-nav]').classList.contains('is-open')"),
        )

        # 実機タップ感を出すために tap を使う (touch context)
        try:
            page.tap(".site-nav a[href='/#about']")
        except Exception as e:
            print(f"  tap failed: {e}, falling back to click")
            page.click(".site-nav a[href='/#about']")
        time.sleep(0.8)

        c_closed = not page.evaluate(
            "document.querySelector('[data-nav]').classList.contains('is-open')"
        )
        c_hash = page.evaluate("location.hash")
        record("C2-menu-tap-close", c_closed, f"closed={c_closed}")
        record("C3-anchor-jumped", c_hash == "#about", f"hash={c_hash}")
        page.screenshot(path=str(SHOT_DIR / "after_about_tap.png"))

        # =========================================================
        # Case D: ESC で閉じる
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

        print("\n========== SUMMARY ==========")
        n_fail = sum(1 for _, r, _ in results if r == "FAIL")
        for case, r, note in results:
            print(f"  [{r}] {case}  {note}")
        print(f"\nTotal: {len(results)}, FAIL: {n_fail}")
        return 0 if n_fail == 0 else 1


if __name__ == "__main__":
    sys.exit(run())
