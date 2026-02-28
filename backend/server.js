require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ================= CORS ================= */
app.use(
  cors({
    origin: ["http://localhost:3000", "https://motonow-gestao-production.up.railway.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());

/* ================= DB ================= */
const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false },
});

db.connect()
  .then(() => console.log("✅ DB OK"))
  .catch((err) => console.error("❌ DB ERRO", err));

/* ================= HEALTH ================= */
app.get("/health", (req, res) => res.json({ status: "ok" }));

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
    if (r.rows.length === 0) return res.status(401).json({ message: "Login inválido" });
    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro login:", err);
    res.status(500).json({ message: "Erro no login" });
  }
});

/* ================= MOTOS ================= */

// cadastrar moto
app.post("/motos", async (req, res) => {
  const { modelo, cor, chassi, filial, santander, cnpj_empresa, ano_moto, valor_compra, repasse } = req.body;

  if (!modelo || !cor || !chassi || !filial) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  try {
    const existe = await db.query(`SELECT id FROM motos WHERE chassi = $1`, [chassi]);
    if (existe.rows.length > 0) {
      return res.status(409).json({ message: "Moto com esse chassi já cadastrada" });
    }

    await db.query(
      `INSERT INTO motos
        (modelo, cor, chassi, filial, status, santander, cnpj_empresa, ano_moto, valor_compra, repasse)
       VALUES
        ($1,$2,$3,$4,'DISPONIVEL',$5,$6,$7,$8,$9)`,
      [
        modelo,
        cor,
        chassi,
        filial,
        santander === true,
        cnpj_empresa || null,
        ano_moto != null && ano_moto !== "" ? Number(ano_moto) : null,
        valor_compra != null && valor_compra !== "" ? Number(valor_compra) : null,
        repasse != null && repasse !== "" ? Number(repasse) : null,
      ]
    );

    res.json({ message: "Moto cadastrada com sucesso" });
  } catch (err) {
    console.error("Erro cadastrar moto:", err);
    res.status(500).json({ message: "Erro ao cadastrar moto" });
  }
});

// listar motos
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
        ano_moto,
        valor_compra,
        repasse,
        CASE WHEN santander = true THEN true ELSE false END AS santander
      FROM motos
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar motos:", err);
    res.status(500).json({ message: "Erro ao buscar motos" });
  }
});

/* ================= VENDAS MOTOS (HISTÓRICO) ================= */
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
        numero_cliente,
        valor,
        forma_pagamento,
        brinde,
        gasolina,
        como_chegou,
        santander,
        cnpj_empresa,
        valor_compra,
        repasse,
        created_at,
        CASE
          WHEN santander = true THEN 'EMENEZES'
          ELSE 'MOTONOW'
        END AS empresa
      FROM vendas_motos
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Erro vendas motos:", err);
    res.status(500).json({ message: "Erro ao buscar vendas de motos" });
  }
});

/* ================= VENDAS MOTOS PENDENTES ================= */

// listar pendentes
app.get("/vendas-motos-pendentes", async (req, res) => {
  try {
    const r = await db.query(
      `SELECT *
       FROM vendas_motos_pendentes
       WHERE status = 'PENDENTE'
       ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error("Erro listar pendentes:", err);
    res.status(500).json({ message: "Erro ao buscar pendentes" });
  }
});

// solicitar venda (vai para pendente)
app.post("/vender-moto", async (req, res) => {
  const {
    moto_id,
    nome_cliente,
    cpf,
    valor,
    forma_pagamento,
    brinde,
    gasolina,
    como_chegou,
    filial_venda,
    numero_cliente, // ✅ esse é o número real
  } = req.body;

  // ✅ validação correta
  if (!moto_id || !filial_venda || !nome_cliente || !numero_cliente || valor == null || valueIsNaN(valor)) {
    return res.status(400).json({ message: "Dados incompletos (moto, cliente, filial, número e valor)" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    // trava moto e valida status
    const motoRes = await client.query(
      `SELECT id, modelo, cor, chassi, filial, status, santander, cnpj_empresa, valor_compra, repasse
       FROM motos
       WHERE id = $1
       FOR UPDATE`,
      [moto_id]
    );

    if (motoRes.rows.length === 0) throw new Error("Moto não encontrada");

    const moto = motoRes.rows[0];
    if (moto.status !== "DISPONIVEL") throw new Error("Moto indisponível para solicitar venda");

    // cria pendência
    const pendRes = await client.query(
      `INSERT INTO vendas_motos_pendentes (
        moto_id, modelo, cor, chassi,
        filial_origem, filial_venda,
        nome_cliente, cpf, telefone, numero_cliente,
        valor, forma_pagamento, brinde, gasolina, como_chegou,
        santander, cnpj_empresa, valor_compra, repasse,
        status
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,
        'PENDENTE'
      )
      RETURNING id`,
      [
        moto.id,
        moto.modelo,
        moto.cor,
        moto.chassi,
        moto.filial,
        filial_venda,
        nome_cliente,
        cpf || null,
        null, // telefone é enfeite (deixa null)
        String(numero_cliente),
        Number(valor),
        forma_pagamento || null,
        !!brinde,
        gasolina != null && gasolina !== "" ? Number(gasolina) : null,
        como_chegou || null,
        !!moto.santander,
        moto.cnpj_empresa || null,
        moto.valor_compra != null ? Number(moto.valor_compra) : null,
        moto.repasse != null ? Number(moto.repasse) : null,
      ]
    );

    // muda status da moto
    await client.query(`UPDATE motos SET status = 'PENDENTE_APROVACAO' WHERE id = $1`, [moto.id]);

    await client.query("COMMIT");
    res.json({ message: "Solicitação enviada para diretoria", pendenciaId: pendRes.rows[0].id });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO SOLICITAR VENDA MOTO:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// aprovar pendência (✅ grava no histórico)
app.post("/vendas-motos-pendentes/:id/aprovar", async (req, res) => {
  const { id } = req.params;
  const { aprovado_por } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const pendRes = await client.query(
      `SELECT * FROM vendas_motos_pendentes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (pendRes.rows.length === 0) throw new Error("Pendência não encontrada");

    const p = pendRes.rows[0];
    if (p.status !== "PENDENTE") throw new Error("Pendência já foi tratada");

    // confere moto
    const motoRes = await client.query(`SELECT id, status FROM motos WHERE id = $1 FOR UPDATE`, [p.moto_id]);
    if (motoRes.rows.length === 0) throw new Error("Moto não existe mais");
    if (motoRes.rows[0].status !== "PENDENTE_APROVACAO") throw new Error("Moto não está mais em pendência");

    // ✅ histórico vendas_motos
    await client.query(
      `INSERT INTO vendas_motos (
        moto_id, modelo, cor, chassi,
        filial_origem, filial_venda,
        nome_cliente, cpf, telefone, numero_cliente,
        valor, forma_pagamento, brinde, gasolina, como_chegou,
        santander, cnpj_empresa, valor_compra, repasse,
        cidade, data_venda
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,
        $20, now()
      )`,
      [
        p.moto_id,
        p.modelo,
        p.cor,
        p.chassi,
        p.filial_origem,
        p.filial_venda,
        p.nome_cliente,
        p.cpf || null,
        null, // telefone enfeite
        p.numero_cliente || null,
        Number(p.valor || 0),
        p.forma_pagamento || null,
        !!p.brinde,
        // gasolina no histórico é TEXT (seu print) -> salva string
        p.gasolina != null ? String(p.gasolina) : null,
        p.como_chegou || null,
        !!p.santander,
        p.cnpj_empresa || null,
        p.valor_compra != null ? Number(p.valor_compra) : null,
        p.repasse != null ? Number(p.repasse) : null,
        p.filial_venda || null, // cidade
      ]
    );

    // baixa moto
    await client.query(`UPDATE motos SET status = 'VENDIDA' WHERE id = $1`, [p.moto_id]);

    // baixa capacete se brinde (no momento da aprovação)
    if (p.brinde === true) {
      const capaceteRes = await client.query(
        `SELECT id, estoque
         FROM pecas
         WHERE nome ILIKE '%CAPACETE%'
           AND cidade = $1
         LIMIT 1`,
        [p.filial_venda]
      );

      if (capaceteRes.rows.length === 0) throw new Error("Sem capacete em estoque para brinde");
      if (Number(capaceteRes.rows[0].estoque) <= 0) throw new Error("Estoque de capacete zerado");

      await client.query(`UPDATE pecas SET estoque = estoque - 1 WHERE id = $1`, [capaceteRes.rows[0].id]);
    }

    // marca pendência
    await client.query(
      `UPDATE vendas_motos_pendentes
       SET status = 'APROVADA',
           aprovado_em = now(),
           aprovado_por = $2
       WHERE id = $1`,
      [id, aprovado_por || null]
    );

    await client.query("COMMIT");
    res.json({ message: "Venda aprovada e registrada no histórico" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO APROVAR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// recusar pendência
app.post("/vendas-motos-pendentes/:id/recusar", async (req, res) => {
  const { id } = req.params;
  const { motivo_recusa, aprovado_por } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const pendRes = await client.query(
      `SELECT * FROM vendas_motos_pendentes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (pendRes.rows.length === 0) throw new Error("Pendência não encontrada");

    const p = pendRes.rows[0];
    if (p.status !== "PENDENTE") throw new Error("Pendência já foi tratada");

    await client.query(`UPDATE motos SET status = 'DISPONIVEL' WHERE id = $1`, [p.moto_id]);

    await client.query(
      `UPDATE vendas_motos_pendentes
       SET status = 'RECUSADA',
           motivo_recusa = $2,
           aprovado_em = now(),
           aprovado_por = $3
       WHERE id = $1`,
      [id, motivo_recusa || null, aprovado_por || null]
    );

    await client.query("COMMIT");
    res.json({ message: "Venda recusada e moto liberada" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO RECUSAR:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

function valueIsNaN(v) {
  return Number.isNaN(Number(v));
}

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => console.log("🚀 API ON", PORT));