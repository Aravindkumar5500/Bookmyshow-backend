"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const DEFAULT_DATA_FILE = path.resolve(__dirname, "..", "data.json");
const DB_NAME = process.env.DB_NAME || "movie_db";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "movies";

function buildMovieDocuments(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("The import file must contain a non-empty JSON array of movies.");
  }

  const seenIds = new Set();

  return records.map((movie, index) => {
    if (!movie || typeof movie !== "object" || Array.isArray(movie)) {
      throw new Error(`Movie at index ${index} must be a JSON object.`);
    }

    if (typeof movie._id !== "string" || !/^[a-f\d]{24}$/i.test(movie._id)) {
      throw new Error(`Movie at index ${index} has an invalid 24-character hexadecimal _id.`);
    }

    const normalizedId = movie._id.toLowerCase();
    if (seenIds.has(normalizedId)) {
      throw new Error(`Duplicate movie _id found: ${movie._id}`);
    }
    seenIds.add(normalizedId);

    if (!movie.shows || typeof movie.shows !== "object" || Array.isArray(movie.shows)) {
      throw new Error(`Movie at index ${index} is missing its date-keyed shows object.`);
    }

    return {
      ...movie,
      _id: new ObjectId(normalizedId),
    };
  });
}

async function importMovieData({
  uri = process.env.DB,
  dataFile = DEFAULT_DATA_FILE,
  dbName = DB_NAME,
  collectionName = COLLECTION_NAME,
} = {}) {
  if (!uri) {
    throw new Error("Missing DB environment variable. Set DB in your local .env file.");
  }

  const rawContent = fs.readFileSync(dataFile, "utf8");
  const sourceRecords = JSON.parse(rawContent);
  const documents = buildMovieDocuments(sourceRecords);
  const client = new MongoClient(uri, {
    maxPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const existingCount = await collection.countDocuments();

    if (existingCount > 0) {
      throw new Error(
        `Refusing to import: ${dbName}.${collectionName} already contains ${existingCount} documents. No records were changed.`
      );
    }

    const result = await collection.insertMany(documents, { ordered: true });
    const importedCount = Object.keys(result.insertedIds).length;
    const finalCount = await collection.countDocuments();

    if (finalCount !== documents.length) {
      throw new Error(
        `Import count mismatch: expected ${documents.length}, found ${finalCount}. Check the collection before retrying.`
      );
    }

    return { importedCount, dbName, collectionName, finalCount };
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  importMovieData()
    .then(({ importedCount, dbName, collectionName, finalCount }) => {
      console.log(
        `Imported ${importedCount} movies into ${dbName}.${collectionName}. Verified document count: ${finalCount}.`
      );
    })
    .catch((error) => {
      console.error("Atlas data import failed:", error.message);
      process.exitCode = 1;
    });
}

module.exports = { buildMovieDocuments, importMovieData };
