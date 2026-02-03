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
  const { search, status, priority, environment, limit } = req.query || {};
  const where = [];
  const values = [];

  if (search) {
    values.push(`%${String(search).toLowerCase()}%`);
    where.push(
      `(LOWER(name) LIKE $${values.length} OR LOWER(description) LIKE $${values.length})`
    );
  }
  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }
  if (priority) {
    values.push(priority);
    where.push(`priority = $${values.length}`);
  }
  if (environment) {
    values.push(environment);
    where.push(`environment = $${values.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitValue = Math.min(Number(limit || 200), 500);
  values.push(limitValue);

  try {
    const result = await pool.query(
      `SELECT id, name, description, environment, status, priority, created_at, updated_at
       FROM projects
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${values.length}`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/projects", async (req, res) => {
  const { name, description, environment, status, priority } = req.body || {};
  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO projects (name, description, environment, status, priority) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, environment, status, priority, created_at, updated_at",
      [
        name,
        description || null,
        environment || null,
        status || "planning",
        priority || "medium",
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, environment, status, priority } = req.body || {};

  try {
    const result = await pool.query(
      "UPDATE projects SET name = $1, description = $2, environment = $3, status = $4, priority = $5, updated_at = NOW() WHERE id = $6 RETURNING id, name, description, environment, status, priority, created_at, updated_at",
      [
        name,
        description || null,
        environment || null,
        status || "planning",
        priority || "medium",
        Number(id),
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "project not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const updates = [];
  const values = [];

  const allowed = ["name", "description", "environment", "status", "priority"];
  allowed.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      values.push(req.body[key] || null);
      updates.push(`${key} = $${values.length}`);
    }
  });

  if (!updates.length) {
    return res.status(400).json({ message: "no valid fields to update" });
  }

  values.push(Number(id));
  try {
    const result = await pool.query(
      `UPDATE projects
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING id, name, description, environment, status, priority, created_at, updated_at`,
      values
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "project not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM projects WHERE id = $1 RETURNING id",
      [Number(id)]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "project not found" });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT status, COUNT(*)::int AS count FROM projects GROUP BY status ORDER BY status"
    );
    res.json(result.rows);
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
    status TEXT DEFAULT 'planning',
    priority TEXT DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planning';

  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';

  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
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
