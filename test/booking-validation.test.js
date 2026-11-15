"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateBookingRequest } = require("../lib/booking-validation");

const validRequest = {
  movieId: "6703d95f72875f399d5d1aa3",
  showId: "show_20261115_1",
  seats: 2,
  name: "Alex Morgan",
  email: "alex@example.com",
  phoneNumber: "+919876543210",
};

test("accepts a valid booking request", () => {
  assert.equal(validateBookingRequest(validRequest), null);
});

test("rejects malformed movie IDs", () => {
  assert.match(validateBookingRequest({ ...validRequest, movieId: "not-an-id" }), /movie ID/);
});

test("rejects missing show IDs", () => {
  assert.match(validateBookingRequest({ ...validRequest, showId: " " }), /show/);
});

test("only accepts whole seat counts from 1 to 10", () => {
  for (const seats of [0, -1, 1.5, 11, "not-a-number"]) {
    assert.match(validateBookingRequest({ ...validRequest, seats }), /1 and 10/);
  }
});

test("rejects short or excessively long customer names", () => {
  assert.match(validateBookingRequest({ ...validRequest, name: "A" }), /valid name/);
  assert.match(validateBookingRequest({ ...validRequest, name: "A".repeat(101) }), /valid name/);
});

test("rejects invalid email addresses", () => {
  assert.match(validateBookingRequest({ ...validRequest, email: "invalid-email" }), /email/);
});

test("rejects malformed phone numbers", () => {
  assert.match(validateBookingRequest({ ...validRequest, phoneNumber: "abc123" }), /phone/);
});
