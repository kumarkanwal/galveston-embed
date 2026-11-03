/* global HTMLElement, URL, console, getComputedStyle, process */

const { existsSync, mkdirSync, readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { chromium } = require(process.env.E24_PLAYWRIGHT_MODULE || "playwright");

const widths = [320, 360, 375, 400, 1024];
const screenshotDir = resolve(process.env.E24_SCREENSHOT_DIR || "docs/phases/E-24");
const devUrl = process.env.E24_WIDGET_URL;

const baseSettings = {
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
};

function business(mode) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: mode === "shuttle" ? "E-24 Shuttle" : "E-24 Taxi",
    type: mode,
    currency: "USD",
    timezone: "America/Chicago",
    distance_unit: "miles",
    emails_enabled: false,
    logo_url: null,
    max_passengers: 12,
    max_luggage: 12,
    settings: baseSettings,
  };
}

const locations = [{
  category_id: "22222222-2222-2222-2222-222222222222",
  category: "Airports",
  locations: [{
    id: "33333333-3333-3333-3333-333333333333",
    name: "Hobby Airport",
    requires_address: false,
  }],
}];

function responseFor(url, mode) {
  if (url.pathname.endsWith("/v1/public/business")) return business(mode);
  if (url.pathname.endsWith("/v1/public/taxi/service-types")) {
    return [{ id: "one", code: "one_way", name: "One Way" }];
  }
  if (url.pathname.endsWith("/v1/public/shuttle/locations")) return locations;
  throw new Error(`Unexpected browser-test request: ${url}`);
}

async function installApiMocks(page, mode) {
  await page.route("**/v1/public/**", async (route) => {
    const data = responseFor(new URL(route.request().url()), mode);
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ data }) });
  });
}

async function installBuiltWidget(page) {
  const bundlePath = resolve("dist/embed.js");
  if (!existsSync(bundlePath)) throw new Error("dist/embed.js is required for browser verification.");
  const bundle = readFileSync(bundlePath, "utf8");
  await page.route("http://e24-widget.test/", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
      <div id="galveston-booking"></div>
      <script src="/embed.js" data-api-base="http://e24-api.test"
        data-business-key="e24-browser"></script>`,
  }));
  await page.route("http://e24-widget.test/embed.js", (route) => route.fulfill({
    contentType: "application/javascript", body: bundle,
  }));
}

async function noHorizontalScroll(locator, label) {
  const size = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  if (size.scrollWidth > size.clientWidth) {
    throw new Error(`${label} scrolls horizontally: ${JSON.stringify(size)}`);
  }
}

async function shuttleGeometry(page) {
  await page.locator(".passenger-trigger").click();
  const popup = page.locator(".passenger-popup-box");
  const geometry = await popup.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const borderRight = Number.parseFloat(style.borderRightWidth);
    const paddingLeft = Number.parseFloat(style.paddingLeft);
    const paddingRight = Number.parseFloat(style.paddingRight);
    const contentRight = rect.right - borderRight - paddingRight;
    const rows = [...element.querySelectorAll(".passenger-popup-row")].map((row) => {
      const stepper = row.querySelector(".passenger-popup-stepper");
      if (!(stepper instanceof HTMLElement)) throw new Error("Missing passenger stepper");
      return {
        rowClientWidth: row.clientWidth,
        rowScrollWidth: row.scrollWidth,
        rowScrollFree: row.scrollWidth <= row.clientWidth,
        stepperClientWidth: stepper.clientWidth,
        stepperScrollWidth: stepper.scrollWidth,
        stepperRight: stepper.getBoundingClientRect().right,
      };
    });
    return {
      contentRight,
      paddingLeft,
      paddingRight,
      popupClientWidth: element.clientWidth,
      popupScrollWidth: element.scrollWidth,
      popupLeft: rect.left,
      popupRight: rect.right,
      rows,
    };
  });
  if (geometry.paddingLeft !== geometry.paddingRight) {
    throw new Error(`Unequal popup padding: ${JSON.stringify(geometry)}`);
  }
  for (const [index, row] of geometry.rows.entries()) {
    if (!row.rowScrollFree || row.stepperRight > geometry.contentRight + 0.5) {
      throw new Error(`Shuttle row ${index + 1} overflows: ${JSON.stringify(geometry)}`);
    }
  }
  await noHorizontalScroll(popup, "shuttle popup");
}

async function taxiGeometry(page) {
  const passenger = page.locator("#passengers");
  await passenger.click();
  await page.keyboard.press("Escape");
  const party = page.locator(".party-fields");
  const geometry = await party.evaluate((element) => {
    return [...element.querySelectorAll(".bag-counter")].map((row) => {
      const stepper = row.querySelector(".counter-controls");
      if (!(stepper instanceof HTMLElement)) throw new Error("Missing taxi bag stepper");
      const style = getComputedStyle(row);
      const rect = row.getBoundingClientRect();
      const contentRight = rect.right - Number.parseFloat(style.borderRightWidth)
        - Number.parseFloat(style.paddingRight);
      return {
        contentRight,
        rowScrollFree: row.scrollWidth <= row.clientWidth,
        stepperRight: stepper.getBoundingClientRect().right,
      };
    });
  });
  for (const [index, row] of geometry.entries()) {
    if (!row.rowScrollFree || row.stepperRight > row.contentRight + 0.5) {
      throw new Error(`Taxi row ${index + 1} overflows: ${JSON.stringify(geometry)}`);
    }
  }
  await noHorizontalScroll(party, "taxi party controls");
}

async function verifyMode(browser, mode, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await installApiMocks(page, mode);
  if (devUrl === undefined) await installBuiltWidget(page);
  await page.goto(devUrl === undefined ? "http://e24-widget.test/" : devUrl);
  const host = page.locator("#galveston-booking");
  await host.locator(mode === "shuttle" ? ".passenger-trigger" : "#passengers").waitFor();
  if (mode === "shuttle") await shuttleGeometry(page);
  else await taxiGeometry(page);
  await noHorizontalScroll(host, `${mode} host`);
  await noHorizontalScroll(host.locator(".widget-root"), `${mode} widget root`);
  await noHorizontalScroll(host.locator(".widget"), `${mode} widget`);
  if (process.env.E24_SKIP_SCREENSHOTS !== "1") {
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({ path: resolve(screenshotDir, `${mode}-${width}.png`), fullPage: true });
  }
  await page.close();
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  try {
    for (const mode of ["shuttle", "taxi"]) {
      for (const width of widths) await verifyMode(browser, mode, width);
    }
  } finally {
    await browser.close();
  }
  console.log(`Playwright passenger overflow checks passed at ${widths.join(", ")}px.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
