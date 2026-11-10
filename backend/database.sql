CREATE DATABASE hotel_db;

-- Connect to hotel_db, then run:
CREATE TABLE IF NOT EXISTS hotels (
  id SERIAL PRIMARY KEY,
  image TEXT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
