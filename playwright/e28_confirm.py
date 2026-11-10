from pathlib import Path

from playwright.sync_api import sync_playwright

import e27_shuttle_confirm as harness


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = ROOT / "docs" / "phases" / "E-28"


def set_business(methods: list[str]) -> None:
    harness.BUSINESS["settings"]["payment_methods"] = methods
    harness.QUOTE["cash_discount"]["percent"] = "10.00"
    harness.QUOTE["cash_discount"]["note"] = "Pay by cash and save on this trip."
    harness.QUOTE["totals_by_payment_method"]["cash"]["adjustments"][0]["label"] = (
        "Cash discount (10%)"
    )


def assert_icons(page) -> None:
    summary_names = page.locator(".shuttle-summary .confirm-icon").evaluate_all(
        "icons => icons.map(icon => icon.dataset.confirmIcon)"
    )
    if summary_names != ["route", "calendar", "vehicle", "person", "luggage"]:
        raise RuntimeError(f"Unexpected summary icons: {summary_names}")
    if page.locator(".input-with-icon .confirm-icon").count() != 2:
        raise RuntimeError("Phone and Email SVG icons were not both rendered.")
    hidden = page.locator(".confirm-icon").evaluate_all(
        "icons => icons.every(icon => icon.getAttribute('aria-hidden') === 'true')"
    )
    if not hidden:
        raise RuntimeError("A decorative Confirm icon is missing aria-hidden=true.")


def assert_terms(page) -> None:
    checkbox = page.locator("#accepted-terms")
    label = page.locator('label[for="accepted-terms"]')
    boxes = [checkbox.bounding_box(), page.locator(".terms-copy").bounding_box()]
    if boxes[0] is None or boxes[1] is None:
        raise RuntimeError("Terms checkbox or label is missing.")
    if abs((boxes[0]["y"] + boxes[0]["height"] / 2)
           - (boxes[1]["y"] + boxes[1]["height"] / 2)) > 8:
        raise RuntimeError(f"Terms checkbox and text are not vertically aligned: {boxes}")
    label.click()
    if not checkbox.is_checked():
        raise RuntimeError("Clicking the Terms label did not toggle the checkbox.")


def reach_confirm(page) -> None:
    page.goto("http://e27-widget.test/")
    page.locator(".shuttle-trip").wait_for()
    page.locator("#date").fill("2026-11-12")
    harness.choose_stop(page, "#fromId", harness.ORIGIN)
    harness.choose_stop(page, "#toId", harness.DESTINATION)
    page.locator(".shuttle-trip").evaluate("form => form.requestSubmit()")
    page.locator(".shuttle-departure").first.wait_for()
    page.locator(".shuttle-departure button").first.click()
    page.locator(".departure-continue").click()
    page.locator(".confirm-layout").wait_for()


def verify_variant(browser, width: int, both_methods: bool) -> None:
    set_business(["cash", "online"] if both_methods else ["cash"])
    page = browser.new_page(viewport={"width": width, "height": 1000})
    harness.install_widget(page)
    quote_calls = harness.install_api(page)
    reach_confirm(page)
    expected_layout = "layout-narrow" if width < 480 else "layout-wide"
    page.wait_for_function(
        "expected => document.querySelector('#galveston-booking')?.shadowRoot"
        "?.querySelector('.widget-root')?.classList.contains(expected)", arg=expected_layout
    )
    assert_icons(page)
    assert_terms(page)
    if page.locator(".shuttle-price-lines .charge-row").count() == 0:
        raise RuntimeError("No charge rows were rendered.")
    aligned = page.locator(".shuttle-price-lines .charge-row").evaluate_all(
        "rows => rows.every(row => row.children.length === 2)"
    )
    if not aligned:
        raise RuntimeError("A charge row does not have label and amount columns.")
    text = page.locator(".widget").inner_text()
    if "Save 10% with Cash!" not in text or "Save 10.00%" in text:
        raise RuntimeError("Cash discount percentage was not compacted to 10%.")
    if both_methods:
        if page.locator('.shuttle-payment-method input[type="radio"]').count() != 2:
            raise RuntimeError("Both-method mode did not render two payment cards.")
        variant = "both"
    else:
        if page.locator(".payment-method").count() != 0:
            raise RuntimeError("Cash-only mode rendered interactive payment cards.")
        if page.locator(".payment-summary").inner_text() != "Payment: Cash":
            raise RuntimeError("Cash-only mode is missing its read-only payment line.")
        if page.locator(".payment-summary [data-confirm-icon='coins']").count() != 1:
            raise RuntimeError("Cash-only payment line is missing the coins SVG.")
        variant = "cash-only"
    if len(quote_calls) != 1:
        raise RuntimeError(f"Confirm used {len(quote_calls)} quote calls instead of one.")
    harness.assert_no_horizontal_scroll(page)
    page.screenshot(path=SCREENSHOT_DIR / f"confirm-{variant}-{width}.png", full_page=True)
    page.close()


def main() -> None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for width in [360, 1024]:
                verify_variant(browser, width, False)
                verify_variant(browser, width, True)
        finally:
            browser.close()
    print("E-28 Playwright checks passed at 360px and 1024px for cash-only and both methods.")


if __name__ == "__main__":
    main()
