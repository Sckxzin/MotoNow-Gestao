require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

/* ================= DATABASE ================= */
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("DB OK"))
  .catch(err => console.error("DB ERRO", err));

/* ================= ROTAS ================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const r = await db.query(
      "SELECT id, username, role, cidade FROM usuarios WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (r.rows.length === 0) {
      return res.status(401).json({ message: "Login inválido" });
    }

    res.json(r.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro servidor" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log("API ON", PORT)
);
