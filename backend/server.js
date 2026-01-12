require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ================= CORS ================= */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://motonow-gestao-production.up.railway.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.options("*", cors());

app.use(express.json());

/* ================= DB ================= */
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

/* ================= FUNÇÃO WHATSAPP ================= */
function notificarWhatsApp(telefone, mensagem) {
  const texto = encodeURIComponent(mensagem);
  const numero = telefone.replace(/\D/g, "");
  return `https://wa.me/55${numero}?text=${texto}`;
}

/* ================= HEALTH ================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================= LOGIN ================= */
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
    res.status(500).json({ message: "Erro no login" });
  }
});

/* ================= PEÇAS ================= */
app.get("/pecas", async (req, res) => {
  const { role, cidade } = req.query;

  try {
    let query = `
      SELECT id, nome, preco, estoque, cidade, tipo_moto
      FROM pecas
    `;
    const params = [];

    if (role === "FILIAL") {
      query += " WHERE cidade = $1";
      params.push(cidade);
    }

    query += " ORDER BY nome";

    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (err) {
    console.error("Erro ao buscar peças:", err);
    res.status(500).json({ message: "Erro ao buscar peças" });
  }
});

/* ================= TRANSFERIR PEÇA ================= */
app.post("/transferir-peca", async (req, res) => {
  const { peca_id, filial_origem, filial_destino, quantidade } = req.body;

  if (!peca_id || !filial_origem || !filial_destino || !quantidade) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  if (filial_origem === filial_destino) {
    return res.status(400).json({ message: "Filiais iguais" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const origemRes = await client.query(
      `SELECT id, nome, estoque
       FROM pecas
       WHERE id = $1 AND cidade = $2`,
      [peca_id, filial_origem]
    );

    if (origemRes.rows.length === 0) {
      throw new Error("Peça não encontrada na filial origem");
    }

    if (origemRes.rows[0].estoque < quantidade) {
      throw new Error("Estoque insuficiente");
    }

    const nomePeca = origemRes.rows[0].nome;

    await client.query(
      `UPDATE pecas SET estoque = estoque - $1 WHERE id = $2`,
      [quantidade, peca_id]
    );

    const destinoRes = await client.query(
      `SELECT id FROM pecas WHERE nome = $1 AND cidade = $2`,
      [nomePeca, filial_destino]
    );

    if (destinoRes.rows.length === 0) {
      await client.query(
        `INSERT INTO pecas (nome, preco, estoque, cidade, tipo_moto)
         SELECT nome, preco, $1, $2, tipo_moto
         FROM pecas WHERE id = $3`,
        [quantidade, filial_destino, peca_id]
      );
    } else {
      await client.query(
        `UPDATE pecas SET estoque = estoque + $1 WHERE id = $2`,
        [quantidade, destinoRes.rows[0].id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Transferência realizada com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

/* ================= VENDER MOTO ================= */
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
    como_chegou,
    filial_venda
  } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const motoRes = await client.query(
      "SELECT * FROM motos WHERE id = $1 AND status = 'DISPONIVEL'",
      [moto_id]
    );

    if (motoRes.rows.length === 0) {
      throw new Error("Moto indisponível");
    }

    const moto = motoRes.rows[0];

    await client.query(
      `INSERT INTO vendas_motos (
        moto_id, modelo, cor, chassi, filial_origem, filial_venda,
        nome_cliente, cpf, telefone, valor, forma_pagamento,
        brinde, gasolina, como_chegou, santander
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )`,
      [
        moto.id,
        moto.modelo,
        moto.cor,
        moto.chassi,
        moto.filial,
        filial_venda,
        nome_cliente,
        cpf,
        telefone,
        valor,
        forma_pagamento,
        brinde,
        gasolina,
        como_chegou,
        moto.santander
      ]
    );

    await client.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = $1",
      [moto_id]
    );

    if (brinde === true) {
      const capaceteRes = await client.query(
        `SELECT id, estoque FROM pecas
         WHERE nome ILIKE '%CAPACETE%' AND cidade = $1 LIMIT 1`,
        [filial_venda]
      );

      if (capaceteRes.rows.length === 0 || capaceteRes.rows[0].estoque <= 0) {
        throw new Error("Sem capacete para brinde");
      }

      await client.query(
        `UPDATE pecas SET estoque = estoque - 1 WHERE id = $1`,
        [capaceteRes.rows[0].id]
      );
    }

    const mensagem = `
🛵 *Venda de Moto*
Cliente: ${nome_cliente}
Modelo: ${moto.modelo}
Valor: R$ ${valor}
Pagamento: ${forma_pagamento}
Filial: ${filial_venda}
    `;

    const whatsapp = notificarWhatsApp(telefone, mensagem);

    await client.query("COMMIT");

    res.json({
      message: "Moto vendida com sucesso",
      whatsapp
    });

  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 API ON", PORT);
});
