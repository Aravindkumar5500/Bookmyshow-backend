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

Set `DB` to your MongoDB connection string. Configure `CLIENT_ORIGIN` as a comma-separated list of the exact frontend origins. Start the API:

```bash
npm start
```

The API listens on `PORT` (default `8000`). `GET /health` reports service health.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/movie/get-movies` | List movies |
| GET | `/movie/:id` | Fetch one movie |
| POST | `/movie/book-movie` | Book 1–10 seats |

Booking requests validate movie/show IDs, customer details and seat count. Seat decrement uses a conditional MongoDB update so concurrent requests cannot oversell the same show in this document model. Insufficient inventory returns HTTP 409 with the latest available count.

## Important limitations

This remains an educational booking prototype. It does not include authentication, payment processing, a payment/booking state machine, seat maps, booking expiry/hold reservations, idempotency keys or MongoDB transactions across multiple documents. For production, add those controls and configure CORS to exact trusted origins. Do not store or process payment card details in this API.
