require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

/* ================= CORS ================= */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://motonow-gestao-production.up.railway.app",
    ],
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
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

/* ================= REGRA REPASSE SANTANDER POR FILIAL + MODELO ================= */

// normaliza texto genérico
function normText(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();
}

// normaliza modelo para chave (remove espaços e caracteres)
function normModeloKey(s) {
  return normText(s).replace(/[^A-Z0-9]/g, ""); // só letras/números
}

// 🔥 MAP com chaves normalizadas
const REPASSE_SANTANDER_POR_MODELO = {
  [normModeloKey("JET 125 SS")]: 8900,
  [normModeloKey("SHI 175 EFI")]: 14900,
  [normModeloKey("STORM 200")]: 19199,
  [normModeloKey("JEF 150")]: 12200,
  [normModeloKey("JET 50")]: 8500,
};

function repasseSantanderPorModelo(modelo) {
  return REPASSE_SANTANDER_POR_MODELO[normModeloKey(modelo)];
}

// normaliza filial (mantém tua regra)
function normFilial(s) {
  return normText(s);
}

function isFilialRepasseSantanderObrigatorio(filial) {
  const f = normFilial(filial);
  return f === "SAO JOSE" || f === "MARAGOGI" || f === "CATENDE" || f === "XEXEU";
}

function repasseSantanderPorModelo(modelo) {
  const key = String(modelo || "").toUpperCase().trim();
  return REPASSE_SANTANDER_POR_MODELO[key];
}

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

/* ================= CADASTRAR MOTO ================= */
app.post("/motos", async (req, res) => {
  const {
    modelo,
    cor,
    chassi,
    filial,
    santander,
    cnpj_empresa,
    ano_moto,
    valor_compra,
    repasse,
  } = req.body;

  if (!modelo || !cor || !chassi || !filial) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  try {
    const existe = await db.query(`SELECT id FROM motos WHERE chassi = $1`, [
      chassi,
    ]);

    if (existe.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Moto com esse chassi já cadastrada" });
    }
let repasseFinal =
  repasse != null && repasse !== "" ? Number(repasse) : null;

if (isFilialRepasseSantanderObrigatorio(filial)) {
  const r = repasseSantanderPorModelo(modelo);
  if (typeof r !== "number") {
    return res.status(400).json({
      message: `Repasse Santander não configurado para o modelo: ${modelo}`,
    });
  }
  repasseFinal = Number(r);
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
        valor_compra != null && valor_compra !== ""
          ? Number(valor_compra)
          : null,
        repasseFinal,
      ]
    );

    res.json({ message: "Moto cadastrada com sucesso" });
  } catch (err) {
    console.error("Erro cadastrar moto:", err);
    res.status(500).json({ message: "Erro ao cadastrar moto" });
  }
});

/* ================= MOTOS (LISTAR) ================= */
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

    const motoRes = await client.query(
      `SELECT id, modelo, chassi, filial, status
       FROM motos
       WHERE id = $1
       FOR UPDATE`,
      [moto_id]
    );

    if (motoRes.rows.length === 0) throw new Error("Moto não encontrada");

    const moto = motoRes.rows[0];

    if (moto.status !== "DISPONIVEL") {
      throw new Error("Moto não está disponível para transferência");
    }

    if (moto.filial === filial_destino) {
      throw new Error("Filial de destino é igual à origem");
    }

    await client.query(
      `UPDATE motos
       SET filial = $1
       WHERE id = $2`,
      [filial_destino, moto_id]
    );
if (isFilialRepasseSantanderObrigatorio(filial_destino)) {
  const r = repasseSantanderPorModelo(moto.modelo);
  if (typeof r !== "number") {
    throw new Error(`Repasse Santander não configurado para o modelo: ${moto.modelo}`);
  }

  await client.query(
    `UPDATE motos SET repasse = $1 WHERE id = $2`,
    [Number(r), moto_id]
  );
}

    await client.query(
      `INSERT INTO transferencias_motos
       (moto_id, modelo, chassi, filial_origem, filial_destino)
       VALUES ($1,$2,$3,$4,$5)`,
      [moto.id, moto.modelo, moto.chassi, moto.filial, filial_destino]
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

/* ================= REVISOES ================= */

// criar revisão (OS)
app.post("/revisoes", async (req, res) => {
  const {
    cidade,
    cliente_nome,
    cliente_telefone,
    cliente_cpf,
    modelo_moto,
    chassi_moto,
    km,
    tipo_revisao,
    observacao,
  } = req.body;

  if (!cidade || !cliente_nome) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  try {
    const r = await db.query(
      `INSERT INTO revisoes
       (cidade, cliente_nome, cliente_telefone, cliente_cpf, modelo_moto, chassi_moto, km, tipo_revisao, observacao, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ABERTA')
       RETURNING *`,
      [
        cidade,
        cliente_nome,
        cliente_telefone || null,
        cliente_cpf || null,
        modelo_moto || null,
        chassi_moto || null,
        km || null,
        tipo_revisao || null,
        observacao || null,
      ]
    );

    res.json(r.rows[0]);
  } catch (err) {
    console.error("Erro criar revisão:", err);
    res.status(500).json({ message: "Erro ao criar revisão" });
  }
});

// adicionar item (peça usada) na revisão
app.post("/revisoes/:id/itens", async (req, res) => {
  const { id } = req.params;
  const { peca_id, quantidade } = req.body;

  if (!peca_id || !quantidade || Number(quantidade) <= 0) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  try {
    const p = await db.query(
      `SELECT id, nome, preco, estoque FROM pecas WHERE id = $1`,
      [peca_id]
    );
    if (p.rows.length === 0)
      return res.status(404).json({ message: "Peça não encontrada" });

    await db.query(
      `INSERT INTO revisao_itens (revisao_id, peca_id, nome_peca, quantidade, preco_unitario)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, peca_id, p.rows[0].nome, Number(quantidade), Number(p.rows[0].preco)]
    );

    res.json({ message: "Item adicionado" });
  } catch (err) {
    console.error("Erro add item revisão:", err);
    res.status(500).json({ message: "Erro ao adicionar item" });
  }
});

// finalizar revisão: calcula total + baixa estoque + registra movimento
app.post("/revisoes/:id/finalizar", async (req, res) => {
  const { id } = req.params;
  const { mao_de_obra = 0, desconto = 0, forma_pagamento } = req.body;

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const revRes = await client.query(`SELECT * FROM revisoes WHERE id = $1`, [
      id,
    ]);
    if (revRes.rows.length === 0) throw new Error("Revisão não encontrada");

    const revisao = revRes.rows[0];
    if (revisao.status === "FINALIZADA") throw new Error("Revisão já finalizada");

    const itensRes = await client.query(
      `SELECT peca_id, nome_peca, quantidade, preco_unitario
       FROM revisao_itens
       WHERE revisao_id = $1`,
      [id]
    );

    // valida estoque
    for (const it of itensRes.rows) {
      if (!it.peca_id) continue;
      const est = await client.query(
        `SELECT estoque, cidade FROM pecas WHERE id = $1`,
        [it.peca_id]
      );
      if (est.rows.length === 0)
        throw new Error(`Peça não existe mais (ID ${it.peca_id})`);
      if (Number(est.rows[0].estoque) < Number(it.quantidade)) {
        throw new Error(`Estoque insuficiente: ${it.nome_peca}`);
      }
    }

    // baixa estoque + movimentos
    for (const it of itensRes.rows) {
      if (!it.peca_id) continue;

      await client.query(`UPDATE pecas SET estoque = estoque - $1 WHERE id = $2`, [
        Number(it.quantidade),
        it.peca_id,
      ]);

      await client.query(
        `INSERT INTO estoque_movimentos (peca_id, cidade, tipo, quantidade, ref_id, observacao)
         VALUES ($1,$2,'REVISAO',$3,$4,$5)`,
        [
          it.peca_id,
          revisao.cidade,
          -Number(it.quantidade),
          Number(id),
          `Revisão #${id} - ${it.nome_peca}`,
        ]
      );
    }

    const totalPecas = itensRes.rows.reduce(
      (acc, it) => acc + Number(it.preco_unitario) * Number(it.quantidade),
      0
    );
    const totalFinal = totalPecas + Number(mao_de_obra) - Number(desconto);

    await client.query(
      `UPDATE revisoes
       SET mao_de_obra = $1,
           desconto = $2,
           total = $3,
           forma_pagamento = $4,
           status = 'FINALIZADA'
       WHERE id = $5`,
      [
        Number(mao_de_obra),
        Number(desconto),
        Number(totalFinal),
        forma_pagamento || null,
        Number(id),
      ]
    );

    await client.query("COMMIT");
    res.json({ message: "Revisão finalizada", total: totalFinal });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO FINALIZAR REVISAO:", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// listar revisões
app.get("/revisoes", async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, created_at, cidade, cliente_nome, modelo_moto, chassi_moto, km, tipo_revisao, total, status
       FROM revisoes
       ORDER BY created_at DESC`
    );
    res.json(r.rows);
  } catch (err) {
    console.error("Erro listar revisões:", err);
    res.status(500).json({ message: "Erro ao buscar revisões" });
  }
});

// detalhe revisão
app.get("/revisoes/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const revRes = await db.query(`SELECT * FROM revisoes WHERE id = $1`, [id]);
    if (revRes.rows.length === 0)
      return res.status(404).json({ message: "Revisão não encontrada" });

    const itensRes = await db.query(
      `SELECT nome_peca, quantidade, preco_unitario
       FROM revisao_itens
       WHERE revisao_id = $1`,
      [id]
    );

    res.json({ revisao: revRes.rows[0], itens: itensRes.rows });
  } catch (err) {
    console.error("Erro detalhe revisão:", err);
    res.status(500).json({ message: "Erro ao buscar revisão" });
  }
});

/* ================= CADASTRAR PEÇA ================= */
app.post("/pecas", async (req, res) => {
  console.log("REQ /pecas:", req.body);

  const { nome, preco, estoque, cidade, tipo_moto } = req.body;

  if (!nome || preco == null || estoque == null || !cidade) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  try {
    const existe = await db.query(
      `SELECT id FROM pecas WHERE nome = $1 AND cidade = $2`,
      [nome, cidade]
    );

    if (existe.rows.length > 0) {
      return res.status(409).json({ message: "Peça já cadastrada nessa filial" });
    }

    await db.query(
      `INSERT INTO pecas (nome, preco, estoque, cidade, tipo_moto)
       VALUES ($1,$2,$3,$4,$5)`,
      [nome, preco, estoque, cidade, tipo_moto || null]
    );

    res.json({ message: "Peça cadastrada com sucesso" });
  } catch (err) {
    console.error("Erro cadastrar peça:", err);
    res.status(500).json({ message: "Erro ao cadastrar peça" });
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
       WHERE id = $1 AND cidade = $2
       FOR UPDATE`,
      [peca_id, filial_origem]
    );

    if (origemRes.rows.length === 0) throw new Error("Peça não encontrada na filial origem");
    if (Number(origemRes.rows[0].estoque) < Number(quantidade)) {
      throw new Error("Estoque insuficiente na filial origem");
    }

    const nomePeca = origemRes.rows[0].nome;

    await client.query(
      `UPDATE pecas
       SET estoque = estoque - $1
       WHERE id = $2`,
      [Number(quantidade), peca_id]
    );

    const destinoRes = await client.query(
      `SELECT id FROM pecas
       WHERE nome = $1 AND cidade = $2`,
      [nomePeca, filial_destino]
    );

    if (destinoRes.rows.length === 0) {
      await client.query(
        `INSERT INTO pecas (nome, preco, estoque, cidade, tipo_moto)
         SELECT nome, preco, $1, $2, tipo_moto
         FROM pecas
         WHERE id = $3`,
        [Number(quantidade), filial_destino, peca_id]
      );
    } else {
      await client.query(
        `UPDATE pecas
         SET estoque = estoque + $1
         WHERE id = $2`,
        [Number(quantidade), destinoRes.rows[0].id]
      );
    }

    await client.query(
      `INSERT INTO transferencias_pecas
       (peca_id, nome_peca, filial_origem, filial_destino, quantidade)
       VALUES ($1,$2,$3,$4,$5)`,
      [peca_id, nomePeca, filial_origem, filial_destino, Number(quantidade)]
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

/* ================= FINALIZAR VENDA (PEÇAS) ================= */
app.post("/finalizar-venda", async (req, res) => {
  const {
    cliente_nome,
    cliente_telefone,
    forma_pagamento,
    itens,
    total,
    cidade,
    observacao,
    modelo_moto,
    chassi_moto,
    km,
  } = req.body;

  if (!cliente_nome || !cliente_telefone || !forma_pagamento || !cidade) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const vendaRes = await client.query(
      `INSERT INTO vendas
       (cliente_nome, cliente_telefone, forma_pagamento, total, cidade, observacao, modelo_moto, chassi_moto,km)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [cliente_nome, cliente_telefone, forma_pagamento, total, cidade, observacao, modelo_moto, chassi_moto, km]
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
      `SELECT id, cliente_nome, cliente_telefone, forma_pagamento, observacao, chassi_moto, km,
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

    res.json({ venda: vendaRes.rows[0], itens: itensRes.rows });
  } catch (err) {
    console.error("Erro nota fiscal:", err);
    res.status(500).json({ message: "Erro ao gerar nota fiscal" });
  }
});

/* ================= HISTÓRICO VENDAS (PEÇAS) ================= */
app.get("/vendas", async (req, res) => {
  try {
    const vendasRes = await db.query(
      `SELECT id, cliente_nome, total, created_at, cidade,forma_pagamento,observacao
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

      vendas.push({ ...v, itens: itensRes.rows });
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
        valor_compra,
        repasse,
        CASE
          WHEN santander = true THEN 'EMENEZES'
          ELSE 'MOTONOW'
        END AS empresa,
        cnpj_empresa
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

/* ================= VENDER MOTO (AGORA É PENDÊNCIA) ================= */
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
    numero_cliente,
  } = req.body;

  // mantém tua validação mínima + evita crash
  if (!moto_id || !filial_venda || !nome_cliente || !valor) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const motoRes = await client.query(
      `SELECT id, modelo, cor, chassi, filial, status, santander, cnpj_empresa, valor_compra, repasse
       FROM motos
       WHERE id = $1
       FOR UPDATE`,
      [moto_id]
    );

    if (motoRes.rows.length === 0) throw new Error("Moto não encontrada");

    const moto = motoRes.rows[0];

let repasseFinal = moto.repasse ?? null;

if (isFilialRepasseSantanderObrigatorio(filial_venda)) {
  const r = repasseSantanderPorModelo(moto.modelo);
  if (typeof r !== "number") {
    throw new Error(`Repasse Santander não configurado para o modelo: ${moto.modelo}`);
  }
  repasseFinal = Number(r);
}

    if (moto.status !== "DISPONIVEL") {
      throw new Error("Moto indisponível");
    }

    // cria pendência
    const pendRes = await client.query(
      `INSERT INTO vendas_motos_pendentes (
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
        telefone || null,
        numero_cliente || null,
        Number(valor),
        forma_pagamento || null,
        !!brinde,
        gasolina != null && gasolina !== "" ? Number(gasolina) : null,
        como_chegou || null,
        !!moto.santander,
        moto.cnpj_empresa || null,
        moto.valor_compra ?? null,
        repasseFinal,
      ]
    );

    // trava moto como pendente
    await client.query(
      `UPDATE motos
       SET status = 'PENDENTE_APROVACAO'
       WHERE id = $1`,
      [moto.id]
    );

    await client.query("COMMIT");
    res.json({
      message: "Solicitação enviada para aprovação",
      pendenciaId: pendRes.rows[0].id,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO VENDER MOTO (PENDÊNCIA):", err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

/* ================= APROVAR / RECUSAR ================= */

// aprovar
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

let repasseFinal = p.repasse ?? null;

if (isFilialRepasseSantanderObrigatorio(p.filial_venda)) {
  const r = repasseSantanderPorModelo(p.modelo);
  if (typeof r !== "number") {
    throw new Error(`Repasse Santander não configurado para o modelo: ${p.modelo}`);
  }
  repasseFinal = Number(r);
}

    const motoRes = await client.query(
      `SELECT id, status FROM motos WHERE id = $1 FOR UPDATE`,
      [p.moto_id]
    );
    if (motoRes.rows.length === 0) throw new Error("Moto não existe mais");
    if (motoRes.rows[0].status !== "PENDENTE_APROVACAO")
      throw new Error("Moto não está mais em pendência");

    // grava no histórico
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
        numero_cliente,
        valor_compra,
        cnpj_empresa,
        repasse
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      )`,
      [
        p.moto_id,
        p.modelo,
        p.cor,
        p.chassi,
        p.filial_origem,
        p.filial_venda,
        p.nome_cliente,
        p.cpf,
        p.telefone,
        p.valor,
        p.forma_pagamento,
        p.brinde,
        p.gasolina,
        p.como_chegou,
        p.santander,
        p.numero_cliente,
        p.valor_compra,
        p.cnpj_empresa,
        p. repasseFinal,
      ]
    );

    // baixa moto
    await client.query(`UPDATE motos SET status = 'VENDIDA' WHERE id = $1`, [
      p.moto_id,
    ]);

    // baixa capacete se brinde
    if (p.brinde === true) {
      const capaceteRes = await client.query(
        `SELECT id, estoque
         FROM pecas
         WHERE nome ILIKE '%CAPACETE%'
           AND cidade = $1
         LIMIT 1`,
        [p.filial_venda]
      );

      if (capaceteRes.rows.length === 0)
        throw new Error("Sem capacete em estoque para brinde");
      if (Number(capaceteRes.rows[0].estoque) <= 0)
        throw new Error("Estoque de capacete zerado");

      await client.query(`UPDATE pecas SET estoque = estoque - 1 WHERE id = $1`, [
        capaceteRes.rows[0].id,
      ]);
    }

    // marca pendência aprovada
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

// recusar
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

    // libera moto
    await client.query(`UPDATE motos SET status = 'DISPONIVEL' WHERE id = $1`, [
      p.moto_id,
    ]);

    // marca pendência recusada
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

/* ================= SERVER ================= */
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 API ON", PORT);
});
