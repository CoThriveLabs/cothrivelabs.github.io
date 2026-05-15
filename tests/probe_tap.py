"""About リンクへの実タップ動作を確認: backdrop が上に乗っているなら hash は変わらず closeMenu だけ走る"""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 375, "height": 800}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto("http://localhost:4321", wait_until="networkidle")
    page.click("[data-nav-toggle]")
    time.sleep(0.6)

    # About リンクの中央座標
    box = page.evaluate("""
        () => {
          const r = document.querySelector(".site-nav a[href='#about']").getBoundingClientRect();
          return {cx: r.left + r.width/2, cy: r.top + r.height/2};
        }
    """)
    cx, cy = box["cx"], box["cy"]
    print(f"tap at ({cx}, {cy})")

    # 実タップ (force click でなく、座標指定で「画面の一番上の要素」をクリック)
    page.mouse.click(cx, cy)
    time.sleep(0.6)

    is_open = page.evaluate("document.querySelector('[data-nav]').classList.contains('is-open')")
    h = page.evaluate("location.hash")
    print(f"after tap: is_open={is_open}, hash={h}")
    print("→ hash が '' のままなら backdrop に吸われている = バグ確定")

    ctx.close()
    browser.close()
