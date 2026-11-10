# Hotel CRUD Application

A beginner-friendly full-stack implementation of the uploaded Hotel List Page task.

## Technology
- Frontend: React + Vite, Redux Toolkit, React Router, React Helmet Async
- Backend: Node.js + Express
- Database: PostgreSQL using native SQL (`pg`), no ORM
- Image upload: Multer (stored locally in `backend/uploads`)

## 1. Requirements
Install Node.js (LTS) and PostgreSQL.

## 2. Database setup
Open pgAdmin or `psql`, then run `backend/database.sql`.

## 3. Start backend
```bash
cd backend
cp .env.example .env
# Edit .env with your PostgreSQL username/password/database
npm install
npm run dev
```
Backend runs at http://localhost:5000

## 4. Start frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open the Vite URL shown in the terminal (usually http://localhost:5173).

## API endpoints
- `GET /api/hotels?search=&minPrice=&maxPrice=&page=1&limit=5`
- `GET /api/hotels/:id`
- `POST /api/hotels` (multipart form: image, title, description, latitude, longitude, price)
- `PUT /api/hotels/:id` (same fields; image optional)
- `DELETE /api/hotels/:id`

## Notes
- Images are saved on the Node.js server in `backend/uploads`.
- The database stores the image URL/path.
- The detail page embeds an OpenStreetMap view using the saved latitude and longitude.
- All image elements have descriptive `alt` text.
- React Helmet Async sets page title and description.
- This is a simple learning project. For production, add authentication, rate limiting, stronger file validation, and secure deployment settings.
