const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 8000;
const DB_NAME = process.env.DB_NAME || "movie_db";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "movies";
const DB_URL = process.env.DB;

if (!DB_URL) {
  throw new Error("Missing DB environment variable. Set DB in your .env file.");
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients and local development. Configure CLIENT_ORIGIN in production.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
}));
app.use(express.json({ limit: "100kb" }));

const mongoClient = new MongoClient(DB_URL, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10000,
});

let movies;

function isValidObjectId(value) {
  return typeof value === "string" && ObjectId.isValid(value) && String(new ObjectId(value)) === value;
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return typeof value === "string" && /^[+\d][\d\s()-]{7,19}$/.test(value.trim());
}

function findShowPath(movie, showId) {
  if (!movie.shows || typeof movie.shows !== "object") return null;

  for (const [date, shows] of Object.entries(movie.shows)) {
    if (!Array.isArray(shows)) continue;
    const index = shows.findIndex((show) => show && show.id === showId);
    if (index !== -1) return { date, index, show: shows[index] };
  }
  return null;
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/movie/get-movies", async (_req, res) => {
  try {
    const result = await movies.find(
      {},
      { projection: { bookings: 0 } }
    ).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error fetching movies:", error);
    res.status(500).json({ message: "Unable to load movies right now." });
  }
});

app.get("/movie/:id", async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ message: "Invalid movie ID." });
  }

  try {
    const movie = await movies.findOne({ _id: new ObjectId(id) });
    if (!movie) return res.status(404).json({ message: "Movie not found." });
    res.json(movie);
  } catch (error) {
    console.error("Error fetching movie:", error);
    res.status(500).json({ message: "Unable to load movie details right now." });
  }
});

app.post("/movie/book-movie", async (req, res) => {
  const { movieId, showId, seats, name, email, phoneNumber } = req.body || {};

  if (!isValidObjectId(movieId)) {
    return res.status(400).json({ message: "A valid movie ID is required." });
  }
  if (typeof showId !== "string" || !showId.trim()) {
    return res.status(400).json({ message: "A valid show is required." });
  }
  const requestedSeats = Number(seats);
  if (!Number.isSafeInteger(requestedSeats) || requestedSeats < 1 || requestedSeats > 10) {
    return res.status(400).json({ message: "Choose between 1 and 10 seats." });
  }
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 100) {
    return res.status(400).json({ message: "Enter a valid name (2–100 characters)." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!isValidPhone(phoneNumber)) {
    return res.status(400).json({ message: "Enter a valid phone number." });
  }

  try {
    const movieObjectId = new ObjectId(movieId);
    const movie = await movies.findOne(
      { _id: movieObjectId },
      { projection: { shows: 1, title: 1 } }
    );
    if (!movie) return res.status(404).json({ message: "Movie not found." });

    const located = findShowPath(movie, showId);
    if (!located) return res.status(404).json({ message: "Show not found." });

    // Conditional update makes the seat check and decrement one atomic operation.
    // The current data model stores shows in date-keyed arrays, so target the exact
    // array element using its stable show ID and require enough seats in the filter.
    const showPath = `shows.${located.date}.${located.index}`;
    const updateResult = await movies.updateOne(
      {
        _id: movieObjectId,
        [`${showPath}.id`]: showId,
        [`${showPath}.seats`]: { $gte: requestedSeats },
      },
      {
        $inc: { [`${showPath}.seats`]: -requestedSeats },
        $push: {
          [`${showPath}.bookings`]: {
            bookingId: new ObjectId().toString(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: phoneNumber.trim(),
            seats: requestedSeats,
            createdAt: new Date(),
          },
        },
      }
    );

    if (updateResult.modifiedCount !== 1) {
      const latestMovie = await movies.findOne(
        { _id: movieObjectId },
        { projection: { shows: 1 } }
      );
      const latestShow = latestMovie && findShowPath(latestMovie, showId);
      if (!latestShow) return res.status(404).json({ message: "Show not found." });
      return res.status(409).json({
        message: `Only ${Number(latestShow.show.seats) || 0} seats are currently available.`,
        availableSeats: Number(latestShow.show.seats) || 0,
      });
    }

    return res.status(201).json({
      message: "Booking created successfully.",
      booking: {
        movieId,
        showId,
        movieTitle: movie.title,
        showDate: located.date,
        showTime: located.show.time,
        seats: requestedSeats,
      },
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ message: "Unable to complete your booking. Please try again." });
  }
});

app.use((error, _req, res, _next) => {
  if (error && error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Request body must contain valid JSON." });
  }
  if (error && error.message === "Origin not allowed by CORS") {
    return res.status(403).json({ message: "This origin is not allowed." });
  }
  console.error("Unhandled API error:", error);
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

async function startServer() {
  try {
    await mongoClient.connect();
    movies = mongoClient.db(DB_NAME).collection(COLLECTION_NAME);
    app.listen(PORT, () => {
      console.log(`Movie API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to MongoDB:", error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing MongoDB connection.`);
  await mongoClient.close();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
