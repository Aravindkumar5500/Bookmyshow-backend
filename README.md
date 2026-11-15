# Movie Booking API — Educational Prototype

An Express and MongoDB API for the companion [Movie Booking UI](https://github.com/Aravindkumar5500/Bookmyshow-client). This independent learning project is not affiliated with BookMyShow.

## Requirements

- Node.js 18+
- MongoDB database containing a `movies` collection with the movie/show structure used by this project.

## Run locally

```bash
npm install
cp .env.example .env
```

Set `DB` to your MongoDB connection string. Configure `CLIENT_ORIGIN` as a comma-separated list of exact frontend origins. Start the API:

```bash
npm start
```

The API listens on `PORT` (default `8000`). `GET /health` reports service health.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Check API health |
| GET | `/movie/get-movies` | List movies |
| GET | `/movie/:id` | Fetch one movie |
| POST | `/movie/book-movie` | Book 1–10 seats |

Booking requests validate movie/show IDs, customer details and seat count. Seat decrement uses a conditional MongoDB update so concurrent requests cannot oversell the same show in this document model. Insufficient inventory returns HTTP 409 with the latest available count. Invalid input returns HTTP 400.

## Import the existing movie catalogue into a new Atlas database

The repository includes a one-time importer for the sample movie catalogue in `data.json`. It converts each string `_id` into a MongoDB `ObjectId`, preserving compatibility with the API's `new ObjectId(movieId)` lookups. The source `data.json` is never modified.

1. Create a local `.env` file with your new Atlas connection URI in `DB`, plus `DB_NAME=movie_db` and `COLLECTION_NAME=movies`.
2. Install dependencies with `npm install`.
3. Run `npm run migrate:atlas-data` from the backend repository root.
4. The importer refuses to run if the destination collection already has documents. Confirm the reported import count before deploying.

Do not commit `.env` or share the Atlas URI. The importer is intended for a fresh, empty destination collection; it does not copy historical customer bookings that are absent from `data.json`.

## Tests

Run booking-request validation unit tests with:

```bash
npm test
```

## Important limitations

This remains an educational booking prototype. It does not include authentication, payment processing, a payment/booking state machine, seat maps, booking expiry/hold reservations, idempotency keys or MongoDB transactions across multiple documents. For production, add those controls and configure CORS to exact trusted origins. Do not store or process payment card details in this API.
