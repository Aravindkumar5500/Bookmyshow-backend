"use strict";

const OBJECT_ID_PATTERN = /^[a-f\\d]{24}$/i;
const EMAIL_PATTERN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const PHONE_PATTERN = /^[+\\d][\\d\\s()-]{7,19}$/;

function validateBookingRequest(input = {}) {
  const { movieId, showId, seats, name, email, phoneNumber } = input;

  if (typeof movieId !== "string" || !OBJECT_ID_PATTERN.test(movieId)) {
    return "A valid movie ID is required.";
  }
  if (typeof showId !== "string" || !showId.trim()) {
    return "A valid show is required.";
  }
  const requestedSeats = Number(seats);
  if (!Number.isSafeInteger(requestedSeats) || requestedSeats < 1 || requestedSeats > 10) {
    return "Choose between 1 and 10 seats.";
  }
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return "Enter a valid name (2–100 characters).";
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (typeof phoneNumber !== "string" || !PHONE_PATTERN.test(phoneNumber.trim())) {
    return "Enter a valid phone number.";
  }
  return null;
}

module.exports = { validateBookingRequest };
