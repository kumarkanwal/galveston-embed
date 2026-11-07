import json
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import Page, Route, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOT_DIR = ROOT / "docs" / "phases" / "E-27"
ORIGIN = {"id": "33333333-3333-3333-3333-333333333333",
          "name": "Hobby Airport", "requires_address": False}
DESTINATION = {"id": "55555555-5555-5555-5555-555555555555",
               "name": "Cruise Terminal", "requires_address": False}
LOCATIONS = [
    {"category_id": "22222222-2222-2222-2222-222222222222",
     "category": "Airports", "locations": [ORIGIN]},
    {"category_id": "44444444-4444-4444-4444-444444444444",
     "category": "Galveston", "locations": [DESTINATION]},
]

BUSINESS = {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Island Shuttle",
    "type": "shuttle",
    "currency": "USD",
    "timezone": "America/Chicago",
    "distance_unit": "miles",
    "emails_enabled": False,
    "logo_url": None,
    "max_passengers": 12,
    "max_luggage": 12,
    "settings": {
        "advance_booking_hours": 0,
        "car_seat_price": "0.00",
        "cash_discount_enabled": True,
        "insurance_enabled": False,
        "insurance_pct": "0.00",
        "max_car_seats": 0,
        "offer_car_seats": False,
        "payment_methods": ["cash", "online"],
        "show_map": False,
        "show_service_dropdown": True,
        "terms_and_conditions": "I agree to the Terms & Conditions.",
    },
    "payments": {
        "card_available": True,
        "environment": "sandbox",
        "square_application_id": "sandbox-app-id",
        "square_location_id": "sandbox-location-id",
    },
}


def search_result(date: str) -> dict:
    return {
        "route": {
            "id": "77777777-7777-7777-7777-777777777777",
            "from": ORIGIN["name"],
            "from_requires_address": False,
            "to": DESTINATION["name"],
            "to_requires_address": False,
            "duration_minutes": 60,
            "service_label": "Internal route name",
        },
        "date_strip": [],
        "departures": [{
            "schedule_id": "66666666-6666-6666-6666-666666666666",
            "start_time": "09:30",
            "end_time": "10:30",
            "duration_minutes": 60,
            "service_label": "Internal route name",
            "vehicle_type_name": "Executive Van",
            "vehicle_type": {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "name": "Executive Van",
            },
            "image_url": None,
            "customer_note": None,
            "from_price": "70.50",
            "prices": {"adult": "70.50", "senior": "60.00", "child": "50.00"},
            "total_for_selection": "70.50",
            "seats_remaining": 8,
            "effective_min_passengers": 1,
            "low_seat_warning": "Selling fast! Less than 10 seats left",
            "selectable": True,
            "unselectable_reason": None,
        }],
        "private_cars": [],
        "filtered_summary": None,
        "on_request": None,
    }


QUOTE = {
    "legs": [{
        "schedule_id": "66666666-6666-6666-6666-666666666666",
        "from": ORIGIN["name"],
        "to": DESTINATION["name"],
        "date": "2026-11-09",
        "time": "09:30",
        "duration_minutes": 60,
        "pax_summary": "1 adult",
        "passenger_lines": [{"passenger_type": "adult", "count": 1,
                             "unit_price": "70.50", "line_total": "70.50"}],
        "charges": [],
        "leg_price": "70.50",
        "service_mode": "shared",
        "effective_min_passengers": 1,
    }],
    "large_bags": 0,
    "small_bags": 0,
    "subtotal": "70.50",
    "discount_amount": "10.50",
    "insurance_amount": "0.00",
    "total": "60.00",
    "currency": "USD",
    "adjustments": [{"label": "Cash discount (15%)", "amount": "-10.50",
                     "kind": "discount", "included_in_total": True}],
    "line_items": None,
    "totals_by_payment_method": {
        "cash": {"adjustments": [{"label": "Cash discount (15%)",
                                    "amount": "-10.50", "kind": "discount",
                                    "included_in_total": True}], "total": "60.00"},
        "online": {"adjustments": [{"label": "CC Surcharge", "amount": "1.50",
                                      "kind": "surcharge", "included_in_total": True}],
                   "total": "72.00"},
    },
    "cash_discount": {"enabled": True, "percent": "15.00",
                      "note": "Pay by cash and save on this trip.",
                      "savings_amount": "10.50"},
}


def install_widget(page: Page) -> None:
    bundle = (ROOT / "dist" / "embed.js").read_text(encoding="utf-8")
    page.route("http://e27-widget.test/", lambda route: route.fulfill(
        content_type="text/html",
        body='''<!doctype html><meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <div id="galveston-booking"></div>
        <script src="/embed.js" data-api-base="http://e27-api.test"
          data-business-key="e27-browser"></script>'''))
    page.route("http://e27-widget.test/embed.js", lambda route: route.fulfill(
        content_type="application/javascript; charset=utf-8", body=bundle))
    square = '''window.Square={payments:function(){return{card:async function(){return{
      attach:async function(selector){var target=document.querySelector(selector);
        if(target){target.innerHTML='<div style="padding:12px;color:#555">Secure card fields</div>';}
      },destroy:async function(){},tokenize:async function(){return{status:'OK',token:'tok_e27'};}
    };}};}};'''
    page.route("https://sandbox.web.squarecdn.com/v1/square.js",
               lambda route: route.fulfill(content_type="application/javascript", body=square))


def install_api(page: Page) -> list[str]:
    quote_calls: list[str] = []

    def handle(route: Route) -> None:
        parsed = urlparse(route.request.url)
        if parsed.path.endswith("/v1/public/business"):
            data = BUSINESS
        elif parsed.path.endswith("/v1/public/shuttle/locations"):
            data = LOCATIONS[1:] if "exclude_location_id" in parse_qs(parsed.query) else LOCATIONS
        elif parsed.path.endswith("/v1/public/shuttle/search"):
            data = search_result(parse_qs(parsed.query).get("date", ["2026-11-09"])[0])
        elif parsed.path.endswith("/v1/public/shuttle/quote"):
            quote_calls.append(route.request.post_data or "")
            data = QUOTE
        else:
            raise RuntimeError(f"Unexpected E-27 browser request: {route.request.url}")
        route.fulfill(content_type="application/json", body=json.dumps({"data": data}))

    page.route("**/v1/public/**", handle)
    return quote_calls


def choose_stop(page: Page, selector: str, location: dict) -> None:
    page.locator(selector).fill(location["name"])
    page.locator(f'[data-location-id="{location["id"]}"]').click()


def assert_no_horizontal_scroll(page: Page) -> None:
    for selector in ["#galveston-booking", ".widget"]:
        size = page.locator(selector).evaluate(
            "element => ({clientWidth: element.clientWidth, scrollWidth: element.scrollWidth})")
        if size["scrollWidth"] > size["clientWidth"]:
            raise RuntimeError(f"{selector} scrolls horizontally: {size}")


def reach_confirm(page: Page) -> None:
    page.goto("http://e27-widget.test/")
    page.locator(".shuttle-trip").wait_for()
    page.locator("#date").fill("2026-11-09")
    choose_stop(page, "#fromId", ORIGIN)
    choose_stop(page, "#toId", DESTINATION)
    page.locator(".shuttle-trip").evaluate("form => form.requestSubmit()")
    page.locator(".shuttle-departure").first.wait_for()
    page.locator(".shuttle-departure button").first.click()
    page.locator(".departure-continue").click()
    page.locator(".confirm-layout").wait_for()


def verify_width(browser, width: int) -> None:
    page = browser.new_page(viewport={"width": width, "height": 1000})
    install_widget(page)
    quote_calls = install_api(page)
    reach_confirm(page)
    expected_layout = "layout-narrow" if width < 480 else "layout-wide"
    page.wait_for_function(
        "expected => document.querySelector('#galveston-booking')?.shadowRoot"
        "?.querySelector('.widget-root')?.classList.contains(expected)", arg=expected_layout)
    if page.locator('.shuttle-payment-method input[type="radio"]').count() != 2:
        raise RuntimeError("Cash and Card payment cards were not both rendered.")
    if not page.locator('input[value="cash"]').is_checked():
        raise RuntimeError("Cash is not the default selected payment method.")
    cash_text = page.locator(".shuttle-charges").inner_text()
    for expected in ["Cash discount (15%)", "$60.00 USD", "Save 15.00% with Cash!",
                     "Pay by cash and save on this trip.", "$10.50 USD"]:
        if expected not in cash_text:
            raise RuntimeError(f"Cash view is missing {expected!r}.")
    assert_no_horizontal_scroll(page)
    page.screenshot(path=SCREENSHOT_DIR / f"confirm-cash-{width}.png", full_page=True)
    page.locator('input[value="online"]').click()
    page.locator(".square-card-field").wait_for()
    page.wait_for_function("() => document.querySelector('#galveston-square-card')?.textContent"
                           "?.includes('Secure card fields')")
    card_text = page.locator(".shuttle-charges").inner_text()
    for expected in ["CC Surcharge", "$72.00 USD"]:
        if expected not in card_text:
            raise RuntimeError(f"Card view is missing {expected!r}.")
    if len(quote_calls) != 1:
        raise RuntimeError(f"Payment switching unexpectedly re-quoted: {len(quote_calls)} calls.")
    assert_no_horizontal_scroll(page)
    page.screenshot(path=SCREENSHOT_DIR / f"confirm-card-{width}.png", full_page=True)
    page.close()


def main() -> None:
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            for width in [360, 1024]:
                verify_width(browser, width)
        finally:
            browser.close()
    print("E-27 Playwright checks passed at 360px and 1024px for Cash and Card.")


if __name__ == "__main__":
    main()
