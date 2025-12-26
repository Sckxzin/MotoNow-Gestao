require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ===== CORS ===== */
app.use(cors({
  origin: ["https://motonow-gestao-production.up.railway.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());

/* ===== DB ===== */
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

/* ===== HEALTH ===== */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ===== LOGIN ===== */
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

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
});

/* ===== PEÇAS ===== */
app.get("/pecas", async (req, res) => {
  const result = await db.query(
    "SELECT id, nome, preco, estoque FROM pecas ORDER BY nome"
  );
  res.json(result.rows);
});

/* ===== MOTOS ===== */
app.get("/motos", async (req, res) => {
  const result = await db.query(
    "SELECT id, modelo, cor, chassi, filial, status FROM motos ORDER BY id"
  );
  res.json(result.rows);
});

/* ===== FINALIZAR VENDA (PEÇAS) ===== */
app.post("/finalizar-venda", async (req, res) => {
  const { cliente_nome, cliente_cpf, forma_pagamento, itens, total } = req.body;

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
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [cliente_nome, cliente_cpf, forma_pagamento, total]
    );

    const vendaId = vendaRes.rows[0].id;

    for (const item of itens) {
      await client.query(
        `INSERT INTO venda_itens
         (venda_id, peca_id, quantidade, preco_unitario)
         VALUES ($1,$2,$3,$4)`,
        [vendaId, item.peca_id, item.quantidade, item.preco_unitario]
      );

      await client.query(
        `UPDATE pecas SET estoque = estoque - $1 WHERE id = $2`,
        [item.quantidade, item.peca_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Venda realizada", vendaId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

/* ===== HISTÓRICO VENDAS MOTOS ===== */
app.get("/vendas-motos", async (req, res) => {
  const result = await db.query(
    "SELECT * FROM vendas_motos ORDER BY data_venda DESC"
  );
  res.json(result.rows);
});

/* ===== VENDER MOTO ===== */
app.post("/vender-moto", async (req, res) => {
  const {
    moto_id, nome_cliente, cpf, telefone,
    valor, forma_pagamento, brinde, gasolina, como_chegou
  } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const motoRes = await client.query(
      "SELECT * FROM motos WHERE id = $1 AND status = 'DISPONIVEL'",
      [moto_id]
    );

    if (motoRes.rows.length === 0)
      throw new Error("Moto indisponível");

    const moto = motoRes.rows[0];

    await client.query(
      `INSERT INTO vendas_motos
       (moto_id, modelo, cor, chassi, filial,
        nome_cliente, cpf, telefone,
        valor, forma_pagamento, brinde, gasolina, como_chegou)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        moto.id, moto.modelo, moto.cor, moto.chassi, moto.filial,
        nome_cliente, cpf, telefone,
        valor, forma_pagamento, brinde, gasolina, como_chegou
      ]
    );

    await client.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = $1",
      [moto_id]
    );

    await client.query("COMMIT");
    res.json({ message: "Moto vendida" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

/* ===== SERVER ===== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 API ON", PORT);
});

