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

// Health
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

// Listar peças
app.get("/pecas", async (req, res) => {
  const { role, cidade } = req.query;

  try {
    let query = "SELECT id, nome, preco, estoque FROM pecas";
    let params = [];

    // 🔒 FILIAL vê só a própria cidade
    if (role === "FILIAL") {
      query += " WHERE cidade = $1";
      params.push(cidade);
    }

    // 🏢 DIRETORIA vê tudo (sem WHERE)

    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("Erro peças:", err);
    res.status(500).json({ message: "Erro ao buscar peças" });
  }
});



// Listar motos
// Listar motos (SEM ano)
app.get("/motos", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, modelo, cor, chassi, filial, status FROM motos ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro motos:", err);
    res.status(500).json({ message: "Erro ao buscar motos" });
  }
});
// 🔥 VENDER MOTO (muda status)
app.post("/vender-moto", async (req, res) => {
  const { moto_id } = req.body;

  if (!moto_id) {
    return res.status(400).json({ message: "ID da moto é obrigatório" });
  }

  try {
    const result = await db.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = $1 AND status = 'DISPONIVEL' RETURNING id",
      [moto_id]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Moto não disponível" });
    }

    res.json({ message: "Moto vendida com sucesso" });
  } catch (err) {
    console.error("Erro vender moto:", err);
    res.status(500).json({ message: "Erro ao vender moto" });
  }
});


// 🔥 FINALIZAR VENDA (PEÇAS)
app.post("/finalizar-venda", async (req, res) => {
  const {
    cliente_nome,
    cliente_cpf,
    forma_pagamento,
    itens,
    total
  } = req.body;

  if (!cliente_nome || !cliente_cpf || !forma_pagamento) {
    return res.status(400).json({ message: "Dados do cliente incompletos" });
  }

  if (!itens || itens.length === 0) {
    return res.status(400).json({ message: "Carrinho vazio" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 🔹 cria venda
    const vendaRes = await client.query(
      `INSERT INTO vendas
       (cliente_nome, cliente_cpf, forma_pagamento, total)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cliente_nome, cliente_cpf, forma_pagamento, total]
    );

    const vendaId = vendaRes.rows[0].id;

    // 🔹 itens + baixa estoque
    for (const item of itens) {
      await client.query(
        `INSERT INTO venda_itens
         (venda_id, peca_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4)`,
        [vendaId, item.peca_id, item.quantidade, item.preco_unitario]
      );

      await client.query(
        `UPDATE pecas
         SET estoque = estoque - $1
         WHERE id = $2`,
        [item.quantidade, item.peca_id]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Venda registrada com sucesso",
      vendaId
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro finalizar venda:", err);
    res.status(500).json({ message: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

// 🔥 LISTAR VENDAS
app.get("/vendas", async (req, res) => {
  try {
    const vendasRes = await db.query(
      `SELECT id, total, created_at
       FROM vendas
       ORDER BY created_at DESC`
    );

    const vendas = [];

    for (const v of vendasRes.rows) {
      const itensRes = await db.query(
        `SELECT
           vi.quantidade,
           vi.preco_unitario,
           p.nome
         FROM venda_itens vi
         JOIN pecas p ON p.id = vi.peca_id
         WHERE vi.venda_id = $1`,
        [v.id]
      );

      vendas.push({
        id: v.id,
        total: v.total,
        data: v.created_at,
        itens: itensRes.rows
      });
    }

    res.json(vendas);
  } catch (err) {
    console.error("Erro listar vendas:", err);
    res.status(500).json({ message: "Erro ao listar vendas" });
  }
});


/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("API ON", PORT);
});

