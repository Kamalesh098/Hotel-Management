import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pool from "./db.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  }
});

function validateHotel(body) {
  const { title, description, latitude, longitude, price } = body;
  if (!title?.trim() || !description?.trim()) return "Title and description are required";
  if (title.trim().length > 150) return "Title must be 150 characters or less";
  if (latitude === "" || longitude === "" || price === "") return "Latitude, longitude and price are required";
  if (!Number.isFinite(Number(latitude)) || Number(latitude) < -90 || Number(latitude) > 90)
    return "Latitude must be between -90 and 90";
  if (!Number.isFinite(Number(longitude)) || Number(longitude) < -180 || Number(longitude) > 180)
    return "Longitude must be between -180 and 180";
  if (!Number.isFinite(Number(price)) || Number(price) < 0) return "Price must be zero or greater";
  return null;
}

function removeImage(imagePath) {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  const fullPath = path.join(uploadDir, filename);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

// List, search, price filter and pagination
app.get("/api/hotels", async (req, res) => {
  try {
    const { search = "", minPrice, maxPrice } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];
    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      conditions.push(`title ILIKE $${values.length}`);
    }
    if (minPrice !== undefined && minPrice !== "") {
      values.push(Number(minPrice));
      conditions.push(`price >= $${values.length}`);
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      values.push(Number(maxPrice));
      conditions.push(`price <= $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM hotels ${where}`, values
    );
    const listValues = [...values, limit, offset];
    const result = await pool.query(
      `SELECT * FROM hotels ${where} ORDER BY id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      listValues
    );
    res.json({
      hotels: result.rows,
      total: Number(countResult.rows[0].count),
      page,
      limit
    });
  } catch (error) {
    console.error("DATABASE ERROR:", error);
    res.status(500).json({
        message: "Could not fetch hotels",
        error: error.message
    });
}
});

// Get one hotel
app.get("/api/hotels/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM hotels WHERE id = $1", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Hotel not found" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ message: "Could not fetch hotel" });
  }
});

// Create hotel
app.post("/api/hotels", upload.single("image"), async (req, res) => {
  try {
    const error = validateHotel(req.body);
    if (error) {
      if (req.file) removeImage(req.file.filename);
      return res.status(400).json({ message: error });
    }
    if (!req.file) return res.status(400).json({ message: "Hotel image is required" });

    const image = `/uploads/${req.file.filename}`;
    const { title, description, latitude, longitude, price } = req.body;
    const result = await pool.query(
      `INSERT INTO hotels (image, title, description, latitude, longitude, price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [image, title.trim(), description.trim(), Number(latitude), Number(longitude), Number(price)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (req.file) removeImage(req.file.filename);
    res.status(500).json({ message: "Could not create hotel" });
  }
});

// Update hotel (image is optional)
app.put("/api/hotels/:id", upload.single("image"), async (req, res) => {
  try {
    const error = validateHotel(req.body);
    if (error) {
      if (req.file) removeImage(req.file.filename);
      return res.status(400).json({ message: error });
    }
    const oldResult = await pool.query("SELECT * FROM hotels WHERE id = $1", [req.params.id]);
    if (!oldResult.rows.length) {
      if (req.file) removeImage(req.file.filename);
      return res.status(404).json({ message: "Hotel not found" });
    }

    const oldHotel = oldResult.rows[0];
    const image = req.file ? `/uploads/${req.file.filename}` : oldHotel.image;
    const { title, description, latitude, longitude, price } = req.body;
    const result = await pool.query(
      `UPDATE hotels SET image=$1, title=$2, description=$3, latitude=$4, longitude=$5, price=$6
       WHERE id=$7 RETURNING *`,
      [image, title.trim(), description.trim(), Number(latitude), Number(longitude), Number(price), req.params.id]
    );
    if (req.file) removeImage(oldHotel.image);
    res.json(result.rows[0]);
  } catch {
    if (req.file) removeImage(req.file.filename);
    res.status(500).json({ message: "Could not update hotel" });
  }
});

// Delete hotel and its local image
app.delete("/api/hotels/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM hotels WHERE id=$1 RETURNING image", [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Hotel not found" });
    removeImage(result.rows[0].image);
    res.json({ message: "Hotel deleted successfully" });
  } catch {
    res.status(500).json({ message: "Could not delete hotel" });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ message: error.message || "Invalid request" });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
