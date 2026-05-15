"""Drawer 内の About 位置にあるトップ要素を elementFromPoint で取得して z-order を診断"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 375, "height": 800}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto("http://localhost:4321", wait_until="networkidle")
    page.click("[data-nav-toggle]")
    time.sleep(0.6)

    info = page.evaluate(
        """
        () => {
          const link = document.querySelector(".site-nav a[href='#about']");
          const r = link.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const stack = document.elementsFromPoint(cx, cy).map(e => ({
            tag: e.tagName,
            cls: e.className,
            id: e.id,
            zIndex: getComputedStyle(e).zIndex,
            position: getComputedStyle(e).position,
            pointerEvents: getComputedStyle(e).pointerEvents,
          }));
          const navCs = getComputedStyle(document.querySelector('.site-nav'));
          const bdCs = getComputedStyle(document.querySelector('[data-nav-backdrop]'));
          return {
            linkRect: {x: r.left, y: r.top, w: r.width, h: r.height},
            cx, cy,
            stack,
            nav: {zIndex: navCs.zIndex, position: navCs.position, transform: navCs.transform},
            backdrop: {zIndex: bdCs.zIndex, position: bdCs.position, pointerEvents: bdCs.pointerEvents, visibility: bdCs.visibility, opacity: bdCs.opacity, inset: bdCs.inset},
          };
        }
        """
    )
    import json
    print(json.dumps(info, indent=2, ensure_ascii=False))
    ctx.close()
    browser.close()
