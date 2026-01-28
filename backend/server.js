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
  const {
    peca_id,
    filial_origem,
    filial_destino,
    quantidade
  } = req.body;

  if (!peca_id || !filial_origem || !filial_destino || !quantidade) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  if (filial_origem === filial_destino) {
    return res.status(400).json({ message: "Filiais iguais" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 🔹 verifica estoque origem
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
      throw new Error("Estoque insuficiente na filial origem");
    }

    const nomePeca = origemRes.rows[0].nome;

    // 🔻 baixa origem
    await client.query(
      `UPDATE pecas
       SET estoque = estoque - $1
       WHERE id = $2`,
      [quantidade, peca_id]
    );

    // 🔺 verifica destino
    const destinoRes = await client.query(
      `SELECT id FROM pecas
       WHERE nome = $1 AND cidade = $2`,
      [nomePeca, filial_destino]
    );

    if (destinoRes.rows.length === 0) {
      // cria peça no destino
      await client.query(
  `INSERT INTO pecas (nome, preco, estoque, cidade, tipo_moto)
   SELECT nome, preco, $1, $2, tipo_moto
   FROM pecas
   WHERE id = $3`,
  [quantidade, filial_destino, peca_id]
);
    } else {
      // soma estoque
      await client.query(
        `UPDATE pecas
         SET estoque = estoque + $1
         WHERE id = $2`,
        [quantidade, destinoRes.rows[0].id]
      );
    }

    // 📜 histórico
    await client.query(
      `INSERT INTO transferencias_pecas
       (peca_id, nome_peca, filial_origem, filial_destino, quantidade)
       VALUES ($1,$2,$3,$4,$5)`,
      [peca_id, nomePeca, filial_origem, filial_destino, quantidade]
    );

    await client.query("COMMIT");
    res.json({ message: "Transferência realizada com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO TRANSFERIR PEÇA:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});
/* ================= MOTOS (CORRIGIDO) ================= */
app.get("/motos", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        modelo,
        cor,
        chassi,
        filial,
        status,
        cnpj_empresa,
        CASE
         WHEN santander = true THEN true
         ELSE false
        END AS santander
      FROM motos
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar motos:", err);
    res.status(500).json({ message: "Erro ao buscar motos" });
  }
});
/* ================= TRANSFERIR MOTO ================= */
app.post("/transferir-moto", async (req, res) => {
  const { moto_id, filial_destino } = req.body;

  if (!moto_id || !filial_destino) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // 🔍 busca moto
    const motoRes = await client.query(
      `SELECT id, modelo, chassi, filial, status
       FROM motos
       WHERE id = $1`,
      [moto_id]
    );

    if (motoRes.rows.length === 0) {
      throw new Error("Moto não encontrada");
    }

    const moto = motoRes.rows[0];

    // ❌ não pode transferir vendida
    if (moto.status !== "DISPONIVEL") {
      throw new Error("Moto não está disponível para transferência");
    }

    // ❌ mesma filial
    if (moto.filial === filial_destino) {
      throw new Error("Filial de destino é igual à origem");
    }

    // 🔄 atualiza filial
    await client.query(
      `UPDATE motos
       SET filial = $1
       WHERE id = $2`,
      [filial_destino, moto_id]
    );

    // 🧾 histórico
    await client.query(
      `INSERT INTO transferencias_motos
       (moto_id, modelo, chassi, filial_origem, filial_destino)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        moto.id,
        moto.modelo,
        moto.chassi,
        moto.filial,
        filial_destino
      ]
    );

    await client.query("COMMIT");
    res.json({ message: "Moto transferida com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO TRANSFERIR MOTO:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});


/* ================= FINALIZAR VENDA (PEÇAS) ================= */
app.post("/finalizar-venda", async (req, res) => {
  const {
    cliente_nome,
    cliente_cpf,
    forma_pagamento,
    itens,
    total,
    cidade,
    observacao,
    modelo_moto,
    chassi_moto
  } = req.body;

  if (!cliente_nome || !cliente_cpf || !forma_pagamento || !cidade) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const vendaRes = await client.query(
      `INSERT INTO vendas
       (cliente_nome, cliente_cpf, forma_pagamento, total, cidade, observacao, modelo_moto, chassi_moto)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [cliente_nome, cliente_cpf, forma_pagamento, total, cidade, observacao, modelo_moto, chassi_moto]
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
        `UPDATE pecas
         SET estoque = estoque - $1
         WHERE id = $2`,
        [item.quantidade, item.peca_id]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Venda realizada", vendaId });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO FINALIZAR VENDA:", err);
    res.status(500).json({ message: "Erro ao finalizar venda" });
  } finally {
    client.release();
  }
});

/* ================= NOTA FISCAL (PEÇAS) ================= */
app.get("/nota-fiscal/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const vendaRes = await db.query(
      `SELECT id, cliente_nome, cliente_cpf, forma_pagamento, observacao, chassi_moto,
              total, cidade, created_at
       FROM vendas
       WHERE id = $1`,
      [id]
    );

    if (vendaRes.rows.length === 0) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    const itensRes = await db.query(
      `SELECT p.nome, vi.quantidade, vi.preco_unitario
       FROM venda_itens vi
       JOIN pecas p ON p.id = vi.peca_id
       WHERE vi.venda_id = $1`,
      [id]
    );

    res.json({
      venda: vendaRes.rows[0],
      itens: itensRes.rows
    });
  } catch (err) {
    console.error("Erro nota fiscal:", err);
    res.status(500).json({ message: "Erro ao gerar nota fiscal" });
  }
});

/* ================= HISTÓRICO VENDAS (PEÇAS) ================= */
app.get("/vendas", async (req, res) => {
  try {
    const vendasRes = await db.query(
      `SELECT id, cliente_nome, total, created_at, cidade
       FROM vendas
       ORDER BY created_at DESC`
    );

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
    res.status(500).json({ message: "Erro ao buscar vendas" });
  }
});

/* ================= HISTÓRICO VENDAS MOTOS ================= */
app.get("/vendas-motos", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        moto_id,
        modelo,
        cor,
        chassi,
        filial_origem,
        filial_venda,
        nome_cliente,
        cpf,
        telefone,
        valor,
        forma_pagamento,
        brinde,
        gasolina,
        como_chegou,
        santander,
        numero_cliente,
        created_at,

        -- ✅ EMPRESA
        CASE
          WHEN santander = true THEN 'EMENEZES'
          ELSE 'MOTONOW'
        END AS empresa,

        -- ✅ CNPJ (SÓ 2 PRIMEIROS DÍGITOS)
        CASE
          WHEN santander = true THEN NULL
          ELSE LEFT(cnpj_empresa, 2)
        END AS cnpj

      FROM vendas_motos
      ORDER BY created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Erro vendas motos:", err);
    res.status(500).json({ message: "Erro ao buscar vendas de motos" });
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
    filial_venda,
    numero_cliente
  } = req.body;

  if (!filial_venda) {
    return res.status(400).json({ message: "Filial da venda não informada" });
  }

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
        moto_id,
        modelo,
        cor,
        chassi,
        filial_origem,
        filial_venda,
        nome_cliente,
        cpf,
        telefone,
        valor,
        forma_pagamento,
        brinde,
        gasolina,
        como_chegou,
        santander,
        numero_cliente
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
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
        moto.santander,
        numero_cliente
      ]
    );

    await client.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = $1",
      [moto_id]
    );

// 🔹 SE TEVE BRINDE → DAR BAIXA EM 1 CAPACETE
if (brinde === true) {

  const capaceteRes = await client.query(
    `SELECT id, estoque
     FROM pecas
     WHERE nome ILIKE '%CAPACETE%'
       AND cidade = $1
     LIMIT 1`,
    [filial_venda]
  );

  if (capaceteRes.rows.length === 0) {
    throw new Error("Sem capacete em estoque para brinde");
  }

  const capacete = capaceteRes.rows[0];

  if (capacete.estoque <= 0) {
    throw new Error("Estoque de capacete zerado");
  }

  await client.query(
    `UPDATE pecas
     SET estoque = estoque - 1
     WHERE id = $1`,
    [capacete.id]
  );
}

    await client.query("COMMIT");
    res.json({ message: "Moto vendida com sucesso" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO VENDER MOTO:", err);
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
