require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { pool } = require("./db");

const app = express();
const port = Number(process.env.PORT || 8080);

app.use(cors());
app.use(express.json());
app.use(morgan("combined"));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.get("/api/projects", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, description, environment, created_at FROM projects ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/projects", async (req, res) => {
  const { name, description, environment } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO projects (name, description, environment) VALUES ($1, $2, $3) RETURNING id, name, description, environment, created_at",
      [name, description || null, environment || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const createTableSql = `
  CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    environment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const waitForDb = async (retries = 12, delayMs = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${attempt}/${retries}).`);
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const start = async () => {
  try {
    await waitForDb();
    await pool.query(createTableSql);
    app.listen(port, () => {
      console.log(`Backend listening on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
