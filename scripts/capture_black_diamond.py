from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "http://localhost:3002"
OUT = Path("output/playwright/black-diamond-completion")


def shot(page, name, full_page=False):
    page.screenshot(path=str(OUT / name), full_page=full_page)


def goto(page, path):
    page.goto(BASE_URL + path, wait_until="networkidle")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()

        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        goto(page, "/")
        shot(page, "homepage-desktop-1920.png")

        page.set_viewport_size({"width": 1440, "height": 1000})
        goto(page, "/")
        shot(page, "homepage-desktop-1440.png")

        page.set_viewport_size({"width": 820, "height": 1180})
        goto(page, "/")
        shot(page, "homepage-tablet.png")

        page.set_viewport_size({"width": 390, "height": 844})
        goto(page, "/")
        shot(page, "homepage-mobile.png")

        page.set_viewport_size({"width": 1440, "height": 1000})
        goto(page, "/home-value")
        shot(page, "home-value-step-address.png")
        page.get_by_label("Property address").fill("123 Lake Wilson Road, Wilson, NC")
        page.get_by_role("button", name="Continue").click()
        page.wait_for_timeout(250)
        shot(page, "home-value-step-email.png")
        page.get_by_label("Email for your valuation follow-up").fill("qa@example.com")
        page.get_by_role("button", name="Continue").click()
        page.wait_for_timeout(250)
        shot(page, "home-value-step-phone-timeline.png")
        page.get_by_label("Phone").fill("252-555-0123")
        page.get_by_role("button", name="Request Valuation").click()
        page.wait_for_selector("[data-amm-step='thank-you']", timeout=5000)
        shot(page, "home-value-thank-you.png")

        goto(page, "/sell")
        shot(page, "seller-path.png")

        goto(page, "/ask")
        shot(page, "ask-mike-page.png")

        goto(page, "/widget-preview")
        shot(page, "widget-preview-closed-desktop.png")
        page.locator("#askmagicmike-widget-root button[aria-label='Open Ask Magic Mike']").click()
        page.wait_for_timeout(800)
        shot(page, "widget-preview-open-desktop.png")

        page.set_viewport_size({"width": 390, "height": 844})
        goto(page, "/widget-preview")
        page.locator("#askmagicmike-widget-root button[aria-label='Open Ask Magic Mike']").click()
        page.wait_for_timeout(800)
        shot(page, "widget-preview-open-mobile.png")

        page.set_viewport_size({"width": 1440, "height": 1000})
        goto(page, "/integrations/ourtownproperties")
        shot(page, "ourtown-integration-preview.png")

        goto(page, "/social-preview")
        shot(page, "social-preview-feed-4x5.png")
        page.set_viewport_size({"width": 430, "height": 932})
        goto(page, "/social-preview")
        shot(page, "social-preview-story-9x16.png")

        browser.close()


if __name__ == "__main__":
    main()
