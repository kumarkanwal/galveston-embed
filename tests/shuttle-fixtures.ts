import type {
  Business,
  LocationGroup,
  LocationOption,
  ShuttleBookingResponse,
  ShuttleDeparture,
  ShuttleQuoteResponse,
  ShuttleSearchResult,
} from "../src/api/client";

export const SHUTTLE_BUSINESS = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Island Shuttle",
  type: "shuttle",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  emails_enabled: false,
  max_passengers: 12,
  max_luggage: 12,
  settings: {
    advance_booking_hours: 2,
    insurance_enabled: false,
    insurance_pct: "0.00",
    offer_car_seats: false,
    max_car_seats: 0,
    car_seat_price: "0.00",
    payment_methods: ["cash"],
    show_map: false,
    show_service_dropdown: false,
    terms_and_conditions: "Please arrive early.",
  },
} satisfies Business;

export const ORIGIN_LOCATION = {
  id: "33333333-3333-3333-3333-333333333333",
  name: "Hobby Airport",
  requires_address: false,
} satisfies LocationOption;

export const DESTINATION_LOCATION = {
  id: "55555555-5555-5555-5555-555555555555",
  name: "Cruise Terminal",
  requires_address: true,
} satisfies LocationOption;

export const LOCATION_GROUPS = [{
  category_id: "22222222-2222-2222-2222-222222222222",
  category: "Airports",
  locations: [ORIGIN_LOCATION],
}, {
  category_id: "44444444-4444-4444-4444-444444444444",
  category: "Galveston",
  locations: [DESTINATION_LOCATION],
}] satisfies LocationGroup[];

export const DEPARTURE = {
  schedule_id: "66666666-6666-6666-6666-666666666666",
  start_time: "09:30",
  end_time: "10:30",
  duration_minutes: 60,
  service_label: "Island Express",
  from_price: "38.50",
  prices: { adult: "38.50", senior: "32.00", child: null },
  total_for_selection: "70.50",
  seats_remaining: 4,
  selectable: true,
  unselectable_reason: null,
  low_seat_warning: "Only 4 seats left",
  vehicle_type: {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Executive Van",
  },
} satisfies ShuttleDeparture;

export const SEARCH_RESULT = {
  route: {
    id: "77777777-7777-7777-7777-777777777777",
    from: "Hobby Airport",
    from_requires_address: false,
    to: "Cruise Terminal",
    to_requires_address: true,
    duration_minutes: 60,
    service_label: "Island Express",
  },
  date_strip: [],
  departures: [DEPARTURE],
  filtered_summary: null,
  on_request: null,
} satisfies ShuttleSearchResult;

export const SHUTTLE_QUOTE = {
  legs: [{
    from: "Hobby Airport", to: "Cruise Terminal", date: "2026-10-30",
    time: "09:30", duration_minutes: 60, pax_summary: "2 adults, 1 senior",
    leg_price: "70.50", schedule_id: DEPARTURE.schedule_id,
  }],
  line_items: [
    { label: "Adult fare", amount: "38.50", kind: "fare", quantity: 1 },
    { label: "Senior fare", amount: "32.00", kind: "fare", quantity: 1 },
  ],
  subtotal: "70.50",
  discount_amount: "0.00",
  insurance_amount: "0.00",
  total: "70.50",
  currency: "USD",
} satisfies ShuttleQuoteResponse;

export const SHUTTLE_BOOKED = {
  order_id: "88888888-8888-8888-8888-888888888888",
  order_number: "SH-2026-001",
  status: "confirmed",
  total: "70.50",
  amount_paid: "0.00",
  legs: [{ booking_id: "99999999-9999-9999-9999-999999999999", seats_confirmed: 2 }],
  confirmation_email_sent: true,
} satisfies ShuttleBookingResponse;
