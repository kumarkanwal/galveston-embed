/* global URL, console, getComputedStyle, process */

const { existsSync, mkdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require(process.env.E26_PLAYWRIGHT_MODULE || "playwright");

const widths = [360, 1024];
const screenshotDir = resolve(process.env.E26_SCREENSHOT_DIR || "docs/phases/E-26");

const locations = [{
  category_id: "22222222-2222-2222-2222-222222222222",
  category: "Airports",
  locations: [{ id: "33333333-3333-3333-3333-333333333333",
    name: "Hobby Airport", requires_address: false }],
}, {
  category_id: "44444444-4444-4444-4444-444444444444",
  category: "Galveston",
  locations: [{ id: "55555555-5555-5555-5555-555555555555",
    name: "Cruise Terminal", requires_address: false }],
}];

function business(mode) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: mode === "shuttle" ? "Island Shuttle" : "Island Transit",
    type: mode,
    currency: "USD",
    timezone: "America/Chicago",
    distance_unit: "miles",
    emails_enabled: false,
    logo_url: null,
    max_passengers: 12,
    max_luggage: 12,
    settings: {
      advance_booking_hours: 0,
      car_seat_price: "0.00",
      cash_discount_enabled: false,
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
}

function departure(id, startTime, seats, total, note = null) {
  return {
    schedule_id: id,
    start_time: startTime,
    end_time: null,
    duration_minutes: 60,
    service_label: "Internal route name",
    vehicle_type: null,
    vehicle_type_name: "14 Passenger Ford Transit",
    image_url: "https://images.e26.test/transit.svg",
    customer_note: note,
    from_price: total,
    prices: { senior: total, adult: total, child: total },
    total_for_selection: total,
    seats_remaining: seats,
    effective_min_passengers: 1,
    low_seat_warning: seats < 10 ? "Selling fast! Less than 10 seats left" : null,
    selectable: true,
    unselectable_reason: null,
  };
}

function searchResult(date) {
  return {
    route: {
      id: "77777777-7777-7777-7777-777777777777",
      from: "Hobby Airport",
      from_requires_address: false,
      to: "Cruise Terminal",
      to_requires_address: false,
      duration_minutes: 60,
      service_label: "Internal route name",
    },
    date_strip: [],
    departures: [
      departure("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "11:30", 18, "12.00"),
      departure("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "08:00", 6, "10.00",
        "Please be ready 15 minutes before departure."),
    ],
    private_cars: [{
      departure_type: "private",
      route_id: "77777777-7777-7777-7777-777777777777",
      vehicle_type_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      vehicle_type_name: "Private SUV",
      image_url: null,
      customer_note: "Call us after collecting your luggage.",
      duration_minutes: 60,
      service_date: date,
      pickup_time: null,
      seat_capacity: 6,
      total_for_selection: "165.00",
      effective_min_passengers: 1,
      service_mode: "private",
      pricing: { mode: "fixed_vehicle", tiers: [], fixed_price: "165.00" },
    }],
    filtered_summary: null,
    on_request: null,
  };
}

function responseFor(requestUrl, mode) {
  const url = new URL(requestUrl);
  if (url.pathname.endsWith("/v1/public/business")) return business(mode);
  if (url.pathname.endsWith("/v1/public/taxi/service-types")) {
    return [{ id: "one", code: "one_way", name: "One Way" }];
  }
  if (url.pathname.endsWith("/v1/public/shuttle/locations")) {
    return url.searchParams.has("exclude_location_id") ? locations.slice(1) : locations;
  }
  if (url.pathname.endsWith("/v1/public/shuttle/search")) {
    return searchResult(url.searchParams.get("date") || "2026-11-06");
  }
  throw new Error(`Unexpected E-26 browser request: ${url}`);
}

async function installMocks(page, mode) {
  await page.route("**/v1/public/**", async (route) => {
    await route.fulfill({ contentType: "application/json",
      body: JSON.stringify({ data: responseFor(route.request().url(), mode) }) });
  });
  await page.route("https://images.e26.test/transit.svg", async (route) => {
    await route.fulfill({ contentType: "image/svg+xml", body:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">'
      + '<rect width="300" height="200" fill="#dce8ef"/><path fill="#337ab7" '
      + 'd="M35 125h15l22-50h126l35 35 30 8v38h-22a30 30 0 0 1-60 0H112a30 30 0 0 1-60 0H35z"/>'
      + '<circle cx="82" cy="156" r="18" fill="#243746"/>'
      + '<circle cx="211" cy="156" r="18" fill="#243746"/></svg>' });
  });
}

async function installWidget(page, mode) {
  const bundlePath = resolve("dist/embed.js");
  if (!existsSync(bundlePath)) throw new Error("dist/embed.js is required for E-26 Playwright.");
  const bundle = readFileSync(bundlePath, "utf8");
  const widgetUrl = `http://e26-${mode}-widget.test/`;
  await page.route(widgetUrl, (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <div id="galveston-booking"></div>
      <script src="/embed.js" data-api-base="http://e26-${mode}-api.test"
        data-business-key="e26-browser"></script>`,
  }));
  await page.route(`${widgetUrl}embed.js`, (route) => route.fulfill({
    headers: { "Content-Type": "application/javascript; charset=utf-8" }, body: bundle,
  }));
  return widgetUrl;
}

async function assertNoHorizontalScroll(locator, label) {
  const size = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
  }));
  if (size.scrollWidth > size.clientWidth) {
    throw new Error(`${label} scrolls horizontally: ${JSON.stringify(size)}`);
  }
}

async function chooseStop(page, inputId, groupIndex, locationIndex) {
  const location = locations[groupIndex].locations[locationIndex];
  await page.locator(inputId).fill(location.name);
  await page.locator(`[data-location-id="${location.id}"]`).click();
}

async function captureShuttle(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await installMocks(page, "shuttle");
  const url = await installWidget(page, "shuttle");
  await page.goto(url);
  await page.locator(".shuttle-trip").waitFor();
  await page.waitForFunction((expected) => document.querySelector("#galveston-booking")
    ?.shadowRoot?.querySelector(".widget-root")?.classList.contains(expected),
  width < 480 ? "layout-narrow" : "layout-wide");
  if ((await page.locator(".widget").textContent())?.includes("Dates and times use")) {
    throw new Error("Shuttle Step 1 still renders the timezone line.");
  }
  await page.screenshot({ path: resolve(screenshotDir, `step1-shuttle-${width}.png`),
    fullPage: true });
  await chooseStop(page, "#fromId", 0, 0);
  await chooseStop(page, "#toId", 1, 0);
  await page.locator(".shuttle-trip").evaluate((form) => form.requestSubmit());
  await page.locator(".shuttle-departure").first().waitFor();
  const order = await page.locator(".departure-primary").allTextContents();
  if (order.join("|") !== "08:00|11:30|Private SUV") {
    throw new Error(`Departure order is wrong: ${order.join("|")}`);
  }
  const imageBox = await page.locator(".departure-image-frame").first().boundingBox();
  const expectedImage = width < 480 ? { width: 90, height: 60 } : { width: 120, height: 80 };
  if (imageBox?.width !== expectedImage.width || imageBox?.height !== expectedImage.height) {
    throw new Error(`Unexpected departure image size: ${JSON.stringify(imageBox)}`);
  }
  const card = page.locator(".shuttle-departure").first();
  const note = card.locator(".departure-note");
  if (width < 480) {
    const widths_ = await Promise.all([card.boundingBox(), note.boundingBox()]);
    if (widths_[0] === null || widths_[1] === null || widths_[1].width < widths_[0].width - 24) {
      throw new Error(`Mobile note is not full width: ${JSON.stringify(widths_)}`);
    }
  } else {
    const divider = await card.locator(".departure-capacity")
      .evaluate((element) => getComputedStyle(element).borderLeftWidth);
    if (divider !== "1px") throw new Error(`Desktop seats divider is ${divider}.`);
  }
  await card.locator("button").click();
  if (await card.locator("button").textContent() !== "Selected") {
    throw new Error("Chosen departure did not show Selected.");
  }
  await page.locator(".departure-continue").waitFor();
  await assertNoHorizontalScroll(page.locator("#galveston-booking"), "shuttle host");
  await assertNoHorizontalScroll(page.locator(".widget"), "shuttle widget");
  await page.screenshot({ path: resolve(screenshotDir, `departures-${width}.png`), fullPage: true });
  await page.close();
}

async function captureTaxi(browser, width) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await installMocks(page, "taxi");
  const url = await installWidget(page, "taxi");
  await page.goto(url);
  await page.locator(".trip-form").waitFor();
  const text = await page.locator(".widget").textContent();
  if (text?.includes("Dates and times use")) throw new Error("Taxi Step 1 renders timezone line.");
  for (const selector of ["#service", "#pickup-date", "#pickup-time", "#passengers"]) {
    if (!await page.locator(selector).isVisible()) throw new Error(`Taxi Step 1 is missing ${selector}.`);
  }
  await assertNoHorizontalScroll(page.locator("#galveston-booking"), "taxi host");
  await page.screenshot({ path: resolve(screenshotDir, `step1-taxi-${width}.png`), fullPage: true });
  await page.close();
}

async function main() {
  mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    for (const width of widths) {
      await captureShuttle(browser, width);
      await captureTaxi(browser, width);
    }
  } finally {
    await browser.close();
  }
  console.log(`E-26 Playwright checks passed at ${widths.join(", ")}px.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
