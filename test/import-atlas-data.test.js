"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ObjectId } = require("mongodb");
const { buildMovieDocuments } = require("../scripts/import-atlas-data");

const validMovie = {
  _id: "6703d95f72875f399d5d1aa3",
  title: "Vettaiyan",
  shows: {
    "2024-10-15": [{ id: "show_20241015_1", time: "07:00 AM", seats: 16 }],
  },
};

test("converts string movie IDs into MongoDB ObjectIds", () => {
  const [movie] = buildMovieDocuments([validMovie]);
  assert.ok(movie._id instanceof ObjectId);
  assert.equal(movie._id.toHexString(), validMovie._id);
});

test("preserves movie fields and nested show data", () => {
  const [movie] = buildMovieDocuments([validMovie]);
  assert.equal(movie.title, validMovie.title);
  assert.deepEqual(movie.shows, validMovie.shows);
});

test("does not mutate the original source records", () => {
  const source = structuredClone(validMovie);
  buildMovieDocuments([source]);
  assert.equal(typeof source._id, "string");
});

test("rejects invalid IDs", () => {
  assert.throws(() => buildMovieDocuments([{ ...validMovie, _id: "not-an-object-id" }]), /invalid.*_id/i);
});

test("rejects duplicate movie IDs", () => {
  assert.throws(() => buildMovieDocuments([validMovie, validMovie]), /Duplicate movie _id/);
});

test("rejects an empty or non-array source", () => {
  assert.throws(() => buildMovieDocuments([]), /non-empty JSON array/);
  assert.throws(() => buildMovieDocuments({ movie: validMovie }), /non-empty JSON array/);
});
