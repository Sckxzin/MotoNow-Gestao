require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ================= CORS ================= */
app.use(cors({
  origin: ["https://motonow-gestao-production.up.railway.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());

/* ================= MIDDLEWARE ================= */
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

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Login
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
    console.error("Erro login:", e);
    res.status(500).json({ message: "Erro servidor" });
  }
});

// 🔥 LISTAR PEÇAS (ESSENCIAL)
app.get("/pecas", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome, preco, estoque FROM pecas"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar peças:", err);
    res.status(500).json({ message: "Erro ao buscar peças" });
  }
});

// 🔥 LISTAR MOTOS
app.get("/motos", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, modelo, ano, cor, chassi, filial, status FROM motos"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar motos:", err);
    res.status(500).json({ message: "Erro ao buscar motos" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("API ON", PORT);
});
