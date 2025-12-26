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
  .then(() => console.log("✅ DB OK"))
  .catch(err => console.error("❌ DB ERRO", err));

/* ================= ROTAS ================= */

/* ---------- HEALTH ---------- */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ---------- LOGIN ---------- */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const r = await db.query(
      `SELECT id, username, role, cidade
       FROM usuarios
       WHERE username = $1 AND password = $2`,
      [username, password]
    );

    if (r.rows.length === 0) {
      return res.status(401).json({ message: "Login inválido" });
    }

    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro login:", err);
    res.status(500).json({ message: "Erro servidor" });
  }
});

/* ---------- PEÇAS ---------- */
app.get("/pecas", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome, preco, estoque FROM pecas ORDER BY nome"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro peças:", err);
    res.status(500).json({ message: "Erro ao buscar peças" });
  }
});

/* ---------- MOTOS ---------- */
app.get("/motos", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, modelo, cor, chassi, filial, status
       FROM motos
       ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro motos:", err);
    res.status(500).json({ message: "Erro ao buscar motos" });
  }
});

/* ---------- VENDA DE PEÇAS ---------- */
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

    const vendaRes = await client.query(
      `INSERT INTO vendas
       (cliente_nome, cliente_cpf, forma_pagamento, total)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [cliente_nome, cliente_cpf, forma_pagamento, total]
    );

    const vendaId = vendaRes.rows[0].id;

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

    res.json({ message: "Venda registrada com sucesso", vendaId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro venda peças:", err);
    res.status(500).json({ message: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

/* ---------- LISTAR VENDAS DE PEÇAS ---------- */
app.get("/vendas-motos", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM vendas_motos
       ORDER BY data_venda DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro histórico motos:", err);
    res.status(500).json({ message: "Erro ao buscar histórico de motos" });
  }
});

    const vendas = [];

    for (const v of vendasRes.rows) {
      const itensRes = await db.query(
        `SELECT vi.quantidade, vi.preco_unitario, p.nome
         FROM venda_itens vi
         JOIN pecas p ON p.id = vi.peca_id
         WHERE vi.venda_id = $1`,
        [v.id]
      );

      vendas.push({
        ...v,
        itens: itensRes.rows
      });
    }

    res.json(vendas);
  } catch (err) {
    console.error("Erro listar vendas:", err);
    res.status(500).json({ message: "Erro ao listar vendas" });
  }
});

/* ---------- VENDA DE MOTO + HISTÓRICO ---------- */
app.post("/vender-moto", async (req, res) => {
  const {
    moto_id,
    nome_cliente,
    cpf,
    telefone,
    valor,
    forma_pagamento,
    brinde,
    gasolina,
    como_chegou
  } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const motoRes = await client.query(
      "SELECT modelo, cor, chassi, filial, status FROM motos WHERE id = $1",
      [moto_id]
    );

    if (motoRes.rows.length === 0)
      throw new Error("Moto não encontrada");

    if (motoRes.rows[0].status !== "DISPONIVEL")
      throw new Error("Moto já vendida");

    const moto = motoRes.rows[0];

    await client.query(
      `INSERT INTO vendas_motos
       (moto_id, modelo, cor, chassi, filial,
        nome_cliente, cpf, telefone,
        valor, forma_pagamento, brinde, gasolina, como_chegou)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        moto_id,
        moto.modelo,
        moto.cor,
        moto.chassi,
        moto.filial,
        nome_cliente,
        cpf,
        telefone,
        valor,
        forma_pagamento,
        brinde,
        gasolina,
        como_chegou
      ]
    );

    await client.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = $1",
      [moto_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Moto vendida com sucesso" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Erro vender moto:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

/* ---------- HISTÓRICO DE VENDAS DE MOTOS ---------- */
app.get("/vendas-motos", async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *
       FROM vendas_motos
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Erro histórico motos:", err);
    res.status(500).json({ message: "Erro ao buscar histórico de motos" });
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 API ON na porta", PORT);
});
