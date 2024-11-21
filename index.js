const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const dotenv = require("dotenv").config();
const URL = process.env.DB;

const DB_NAME = "movie_db";
const COLLECTION_NAME = "movies";
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

// Fetching Movies
app.get("/movie/get-movies", async (req, res) => {
  try {
    // Ensure to await the connection
    const client = await new MongoClient(URL).connect();
    let db = client.db(DB_NAME);
    let collection = db.collection(COLLECTION_NAME);

    let movies = await collection.find({}).toArray();
    client.close(); // Ensure to close the connection

    res.json(movies);
  } catch (error) {
    console.log("Error fetching movies:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Fetch Movie Details by ID
app.get("/movie/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Ensure to await the connection
    const client = await new MongoClient(URL).connect();
    let db = client.db(DB_NAME);
    let dbcollection = db.collection(COLLECTION_NAME);

    let movie = await dbcollection.findOne({ _id: new ObjectId(id) });
    client.close(); // Ensure to close the connection

    if (!movie) {
      return res.status(404).json({ message: "Movie not found" });
    }

    res.json(movie);
  } catch (error) {
    console.log("Error fetching movie by ID:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

// Booking Tickets
app.post("/movie/book-movie", async (req, res) => {
  let bookingRequest = req.body;

  if (
    !bookingRequest.movieId ||
    !bookingRequest.showId ||
    !bookingRequest.seats ||
    !bookingRequest.name ||
    !bookingRequest.email ||
    !bookingRequest.phoneNumber
  ) {
    return res.status(401).json({ message: "Some fields are missing" });
  }
  let requestedSeat = parseInt(bookingRequest.seats);

  if (isNaN(requestedSeat) || requestedSeat <= 0) {
    return res.status(401).json({ message: "Invalid seat count" });
  }

  try {
    // Ensure to await the connection
    const client = await new MongoClient(URL).connect();
    let db = client.db(DB_NAME);
    let dbcollection = db.collection(COLLECTION_NAME);

    let movie = await dbcollection.findOne({
      _id: new ObjectId(bookingRequest.movieId),
    });

    if (!movie) {
      client.close();
      return res.status(404).json({ message: "Requested movie not found" });
    }

    const show = Object.values(movie.shows)
      .flat()
      .find((s) => s.id === bookingRequest.showId);

    if (!show) {
      client.close();
      return res.status(404).json({ message: "Show not found" });
    }

    if (parseInt(show.seats) < requestedSeat) {
      client.close();
      return res.status(404).json({ message: "Not enough seats available" });
    }

    const updateSeats = parseInt(show.seats) - requestedSeat;

    const date = Object.keys(movie.shows).find((d) =>
      movie.shows[d].some((s) => s.id === bookingRequest.showId)
    );

    const showIndex = movie.shows[date].findIndex(
      (s) => s.id === bookingRequest.showId
    );

    const userBooking = {
      name: bookingRequest.name,
      email: bookingRequest.email,
      phoneNumber: bookingRequest.phoneNumber,
      seats: bookingRequest.seats,
    };

    const updatedResult = await dbcollection.updateOne(
      {
        _id: new ObjectId(bookingRequest.movieId),
      },
      {
        $set: {
          [`shows.${date}.${showIndex}.seats`]: updateSeats,
        },
        $push: {
          [`shows.${date}.${showIndex}.bookings`]: userBooking,
        },
      }
    );

    client.close(); // Ensure to close the connection

    if (updatedResult.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update booking" });
    }

    return res.status(200).json({ message: "Booking created successfully" });
  } catch (error) {
    console.log("Error during booking:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

app.listen(8000, () => {
  console.log("Server is running on port 8000");
});
