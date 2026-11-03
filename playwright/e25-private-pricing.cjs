/* global URL, console, getComputedStyle, process */

const { existsSync, mkdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require(process.env.E25_PLAYWRIGHT_MODULE || "playwright");

const widths = [360, 1024];
const screenshotDir = resolve(process.env.E25_SCREENSHOT_DIR || "docs/phases/E-25");

const business = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "E-25 Island Shuttle",
  type: "shuttle",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  emails_enabled: false,
  logo_url: null,
  max_passengers: 12,
  max_luggage: 12,
  settings: {
    advance_booking_hours: 2,
    car_seat_price: "0.00",
    insurance_enabled: false,
    insurance_pct: "0.00",
    max_car_seats: 0,
    offer_car_seats: false,
    payment_methods: ["cash"],
    show_map: false,
    show_service_dropdown: true,
    terms_and_conditions: null,
  },
};

const origin = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "Hobby Airport",
  requires_address: false,
};
const destination = {
  id: "55555555-5555-5555-5555-555555555555",
  name: "Cruise Terminal",
  requires_address: false,
};
const locationGroups = [{
  category_id: "22222222-2222-2222-2222-222222222222",
  category: "Airports",
  locations: [origin],
}, {
  category_id: "44444444-4444-4444-4444-444444444444",
  category: "Galveston",
  locations: [destination],
}];

function searchResult(date) {
  return {
    route: {
      id: "77777777-7777-7777-7777-777777777777",
      from: origin.name,
      from_requires_address: false,
      to: destination.name,
      to_requires_address: false,
      duration_minutes: 60,
      service_label: "Internal route",
    },
    date_strip: [],
    departures: [],
    private_cars: [{
      departure_type: "private",
      route_id: "77777777-7777-7777-7777-777777777777",
      vehicle_type_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      vehicle_type_name: "Private SUV",
      service_date: date,
      pickup_time: null,
      seat_capacity: 5,
      total_for_selection: "165.00",
      effective_min_passengers: 1,
      service_mode: "private",
      pricing: { mode: "fixed_vehicle", tiers: [], fixed_price: "165.00" },
    }],
    filtered_summary: null,
    on_request: null,
  };
}

const quote = {
  legs: [{
    schedule_id: null,
    departure_type: "private",
    route_id: "77777777-7777-7777-7777-777777777777",
    vehicle_type_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    pickup_date: "2026-11-04",
    pickup_time: null,
    from: origin.name,
    to: destination.name,
    date: "2026-11-04",
    time: null,
    duration_minutes: 60,
    pax_summary: "1 adult",
    passenger_lines: [{
      passenger_type: "adult", count: 1, unit_price: "165.00", line_total: "165.00",
    }],
    charges: [{
      label: "Peak Hours Increase", amount: "15.00",
      kind: "surcharge", included_in_total: true,
    }],
    leg_price: "180.00",
    service_mode: "private",
    pricing: { mode: "fixed_vehicle", tiers: [], fixed_price: "165.00" },
    effective_min_passengers: 1,
  }],
  large_bags: 0,
  small_bags: 0,
  subtotal: "180.00",
  discount_amount: "0.00",
  insurance_amount: "0.00",
  total: "180.00",
  currency: "USD",
  adjustments: [],
  line_items: null,
};

function responseFor(requestUrl) {
  const url = new URL(requestUrl);
  if (url.pathname.endsWith("/v1/public/business")) return business;
  if (url.pathname.endsWith("/v1/public/shuttle/locations")) {
    return url.searchParams.has("exclude_location_id") ? locationGroups.slice(1) : locationGroups;
  }
  if (url.pathname.endsWith("/v1/public/shuttle/search")) {
    return searchResult(url.searchParams.get("date") || "2026-11-04");
  }
  if (url.pathname.endsWith("/v1/public/shuttle/quote")) return quote;
  throw new Error(`Unexpected browser-test request: ${url}`);
}

async function installMocks(page) {
  await page.route("**/v1/public/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ data: responseFor(route.request().url()) }),
    });
  });
}

async function installWidget(page) {
  const bundlePath = resolve("dist/embed.js");
  if (!existsSync(bundlePath)) throw new Error("dist/embed.js is required.");
  const bundle = readFileSync(bundlePath, "utf8");
  await page.route("http://e25-widget.test/", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <div id="galveston-booking"></div>
      <script src="/embed.js" data-api-base="http://e25-api.test"
        data-business-key="e25-browser"></script>`,
  }));
  await page.route("http://e25-widget.test/embed.js", (route) => route.fulfill({
    headers: { "Content-Type": "application/javascript; charset=utf-8" }, body: bundle,
  }));
}

async function assertNoHorizontalScroll(locator, label) {
  const size = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
  }));
  if (size.scrollWidth > size.clientWidth) {
    throw new Error(`${label} scrolls horizontally: ${JSON.stringify(size)}`);
  }
}

async function chooseStop(page, inputId, name, locationId) {
  await page.locator(inputId).fill(name);
  await page.locator(`[data-location-id="${locationId}"]`).click();
}

async function captureTrip(page, width) {
  const grid = page.locator(".shuttle-trip-fields");
  const departureBefore = await page.locator("#date").boundingBox();
  const hidden = page.locator(".return-date-slot");
  if (await hidden.getAttribute("aria-hidden") !== "true") {
    throw new Error("Unticked Return Date must be aria-hidden.");
  }
  if (!await page.locator("#returnDate").isDisabled()) {
    throw new Error("Unticked Return Date must be disabled.");
  }
  if (await grid.locator(":scope > .field").count() !== 2) {
    throw new Error("Return Date must retain its grid slot.");
  }
  await page.screenshot({ path: resolve(screenshotDir, `trip-unticked-${width}.png`), fullPage: true });
  await page.locator(".trip-kind input").click();
  const departureAfter = await page.locator("#date").boundingBox();
  if (departureBefore?.x !== departureAfter?.x || departureBefore?.width !== departureAfter?.width) {
    throw new Error("Departure Date moved when Return Date appeared.");
  }
  if (await hidden.getAttribute("aria-hidden") !== "false") {
    throw new Error("Ticked Return Date must be announced.");
  }
  await page.screenshot({ path: resolve(screenshotDir, `trip-ticked-${width}.png`), fullPage: true });
}

async function reachConfirm(page) {
  if (await page.locator(".trip-kind input").isChecked()) {
    await page.locator(".trip-kind input").click();
  }
  await chooseStop(page, "#fromId", origin.name, origin.id);
  await chooseStop(page, "#toId", destination.name, destination.id);
  await page.locator(".shuttle-trip").evaluate((form) => form.requestSubmit());
  const row = page.locator(".shuttle-departure.private");
  await row.waitFor();
  if (await row.locator('input[type="time"]').count() !== 0) {
    throw new Error("Private rows must not contain a time input.");
  }
  if (!await row.textContent().then((text) => text?.includes("Pickup time will be arranged by phone"))) {
    throw new Error("Private arranged-by-phone text is missing.");
  }
  await row.locator("button").click();
  await page.locator(".confirm-layout").waitFor();
  const content = await page.locator(".widget").textContent();
  for (const expected of ["Time: to be arranged", "Outbound: Adult × 1 $165.00 USD",
    "Peak Hours Increase", "(included)", "Total$180.00 USD"]) {
    if (!content?.replace(/\s+/g, " ").includes(expected)) {
      throw new Error(`Confirm is missing: ${expected}`);
    }
  }
}

async function verifyWidth(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await installMocks(page);
  await installWidget(page);
  await page.goto("http://e25-widget.test/");
  await page.locator(".shuttle-trip").waitFor();
  mkdirSync(screenshotDir, { recursive: true });
  await captureTrip(page, width);
  await reachConfirm(page);
  await assertNoHorizontalScroll(page.locator("#galveston-booking"), "widget host");
  await assertNoHorizontalScroll(page.locator(".widget"), "widget");
  await page.screenshot({ path: resolve(screenshotDir, `confirm-${width}.png`), fullPage: true });
  await page.close();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    for (const width of widths) await verifyWidth(browser, width);
  } finally {
    await browser.close();
  }
  console.log(`E-25 Playwright checks passed at ${widths.join(", ")}px.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
