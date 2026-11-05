# Movie Booking API — Educational Prototype

A small Express and MongoDB API supporting movie data retrieval and a basic seat-booking flow for the companion [Movie Booking UI](https://github.com/Aravindkumar5500/Bookmyshow-client).

This is an independent educational project and is not affiliated with BookMyShow.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/movie/get-movies` | List movie records |
| GET | `/movie/:id` | Fetch one movie record |
| POST | `/movie/book-movie` | Submit a basic booking request |

## Tech stack

- Node.js
- Express
- MongoDB Node.js driver
- dotenv
- CORS

## Run locally

```bash
git clone https://github.com/Aravindkumar5500/Bookmyshow-backend.git
cd Bookmyshow-backend
npm install
cp .env.example .env
```

Set the database connection:

```env
DB=your_mongodb_connection_string
```

Start the API (currently listens on port `8000`):

```bash
node index.js
```

## Related frontend

- [Bookmyshow-client](https://github.com/Aravindkumar5500/Bookmyshow-client)

## Production limitations

This is a learning prototype. Before production use, add transaction-safe seat inventory updates, booking ownership and authentication, input validation, payment integration, rate limiting, and restricted CORS. Do not treat the current seat decrement flow as concurrency-safe ticket inventory.
