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
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id", "x-role"],
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

/* ================= ADICIONAR ESTOQUE EM PEÇA EXISTENTE ================= */
app.put("/pecas/:id/adicionar-estoque", async (req, res) => {
  const { id } = req.params;
  const { quantidade, preco } = req.body;

  if (!quantidade || Number(quantidade) <= 0) {
    return res.status(400).json({ message: "Quantidade inválida" });
  }

  try {
    const pecaRes = await db.query(
      `SELECT id, nome, estoque, cidade, preco
       FROM pecas
       WHERE id = $1`,
      [id]
    );

    if (pecaRes.rows.length === 0) {
      return res.status(404).json({ message: "Peça não encontrada" });
    }

    const peca = pecaRes.rows[0];
    const novoPreco =
      preco != null && preco !== "" ? Number(preco) : Number(peca.preco);

    const r = await db.query(
      `UPDATE pecas
       SET estoque = estoque + $1,
           preco = $2
       WHERE id = $3
       RETURNING *`,
      [Number(quantidade), novoPreco, id]
    );

    // opcional: registrar movimento
    await db.query(
      `INSERT INTO estoque_movimentos (peca_id, cidade, tipo, quantidade, ref_id, observacao)
       VALUES ($1, $2, 'ENTRADA', $3, $4, $5)`,
      [
        Number(id),
        peca.cidade,
        Number(quantidade),
        null,
        `Entrada manual de estoque - ${peca.nome}`,
      ]
    );

    res.json({
      message: "Estoque adicionado com sucesso",
      peca: r.rows[0],
    });
  } catch (err) {
    console.error("Erro adicionar estoque:", err);
    res.status(500).json({ message: "Erro ao adicionar estoque" });
  }
});

function normalizarModeloComissao(nome) {
  return String(nome || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

const TABELA_COMISSOES = {
  PHOENIXS50: { v30: 8500, v50: 9000, v100: 9800 },
  PHOENIX50SEFI: { v30: 9800, v50: 10500, v100: 11550 },
  JET50: { v30: 9800, v50: 10000, v100: 10800 },
  RIO125: { v30: 10650, v50: 11200, v100: 12200 },
  JET125SS: { v30: 10500, v50: 11000, v100: 11700 },
  NEWJET125: { v30: 11300, v50: 11600, v100: 12390 },
  JET125EFI: { v30: 12390, v50: 12800, v100: 13390 },
  JEF150S: { v30: 13990, v50: 14500, v100: 15290 },
  JEF150EFI: { v30: 15500, v50: 16800, v100: 17160 },
  NEWJEF: { v30: 15000, v50: 16000, v100: 16190 },
  SHI175: { v30: 14390, v50: 14800, v100: 16280 },
  SHI175SEFI: { v30: 16800, v50: 17000, v100: 18300 },
  FREE150EFI: { v30: 12000, v50: 12890, v100: 14179 },
  URBAN150EFI: { v30: 20000, v50: 21000, v100: 22990 },
  SHI250EFI: { v30: 22500, v50: 23490, v100: 25839 },
  STORM200: { v30: 20390, v50: 21000, v100: 22990 },
  FLASH250: { v30: 22800, v50: 23490, v100: 25839 },
  TITANIUM: { v30: 25428, v50: 26490, v100: 29139 },
  DENVER: { v30: 25428, v50: 26490, v100: 29139 },
  IRON: { v30: 23490, v50: 23490, v100: 25839 },
  PT1: { v30: 6800, v50: 6800, v100: 7480 },
  PT1S: { v30: 7000, v50: 7300, v100: 8030 },
  ATV125: { v30: 15500, v50: 15500, v100: 17050 },
  ATV125EFI: { v30: 17000, v50: 17000, v100: 18700 },
  ATV200: { v30: 22788, v50: 22000, v100: 24200 },
  ATVEFI200: { v30: 25000, v50: 25000, v100: 26000 },
  NEWATV200EFI: { v30: 25000, v50: 25500, v100: 26500 },
};

function calcularComissaoMoto(modelo, valorVenda) {
  const chave = normalizarModeloComissao(modelo);
  const regra = TABELA_COMISSOES[chave];
  const valor = Number(valorVenda || 0);

  if (!regra || !valor) return 0;

  const v30 = Number(regra.v30 || 0);
  const v50 = Number(regra.v50 || 0);
  const v100 = Number(regra.v100 || 0);

  // 🔥 bateu meta máxima
  if (valor >= v100) return 100;

  // 🔥 entre v50 e v100
  if (valor >= v50) {
    const extra = Math.floor((valor - v50) / 20);
    return Math.min(50 + extra, 99);
  }

  // 🔥 entre v30 e v50
  if (valor >= v30) {
    const extra = Math.floor((valor - v30) / 20);
    return Math.min(30 + extra, 49);
  }

  // 🔥 abaixo do mínimo
  return 30;
}

app.put("/vendas-motos/:id", async (req, res) => {
  const { id } = req.params;

  const {
    valor,
    rp,
    forma_pagamento,
    gasolina,
    brinde,
    local_retirada,
    filial_retirada,
    comissao_valor,
  } = req.body;

  try {
    const vendaExiste = await db.query(
      `SELECT id FROM vendas_motos WHERE id = $1`,
      [id]
    );

    if (vendaExiste.rows.length === 0) {
      return res.status(404).json({ message: "Venda de moto não encontrada" });
    }

    const result = await db.query(
      `UPDATE vendas_motos
       SET valor = $1,
           rp = $2,
           forma_pagamento = $3,
           gasolina = $4,
           brinde = $5,
           local_retirada = $6,
           filial_retirada = $7,
           comissao_valor = $8
       WHERE id = $9
       RETURNING *`,
      [
        valor != null && valor !== "" ? Number(valor) : 0,
        Boolean(rp),
        forma_pagamento || null,
        gasolina != null && gasolina !== "" ? Number(gasolina) : null,
        Boolean(brinde),
        local_retirada || null,
        filial_retirada || null,
        comissao_valor != null && comissao_valor !== "" ? Number(comissao_valor) : 0,
        Number(id),
      ]
    );

    res.json({
      message: "Venda de moto atualizada com sucesso",
      venda: result.rows[0],
    });
  } catch (err) {
    console.error("Erro editar venda moto:", err);
    res.status(500).json({ message: "Erro ao editar venda moto" });
  }
});

app.post("/financeiro", async (req, res) => {
  const {
    data,
    saldo,
    a_receber,
    estoque_compra,
    estoque_venda,
    shineray,
    eduardo,
    fornecedor,
    jota_compra,
    jota_venda
  } = req.body;

  await pool.query(
    `INSERT INTO financeiro_historico 
    (data, saldo, a_receber, estoque_compra, estoque_venda, shineray, eduardo, fornecedor, jota_compra, jota_venda)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      data,
      saldo,
      a_receber,
      estoque_compra,
      estoque_venda,
      shineray,
      eduardo,
      fornecedor,
      jota_compra,
      jota_venda
    ]
  );

  res.json({ ok: true });
});

app.get("/financeiro", async (req, res) => {
  const r = await pool.query(
    "SELECT * FROM financeiro_historico ORDER BY data ASC"
  );

  res.json(r.rows);
});


/* ================= VALORES DE VENDA ================= */
const VALOR_VENDA_MODELOS = {
  PHOENIXS50: 8500,
  PHOENIX50SEFI: 9800,
  JET50: 9800,
  RIO125: 10650,
  JET125SS: 10500,
  NEWJET125: 11300,
  JET125EFI: 12390,
  JEF150S: 13990,
  JEF150EFI: 15500,
  NEWJEF: 15000,
  SHI175: 14390,
  SHI175SEFI: 16800,
  FREE150EFI: 12000,
  URBAN150EFI: 20000,
  SHI250EFI: 22500,
  STORM200: 20390,
  FLASH250: 22800,
  TITANIUM: 25428,
  DENVER: 25428,
  IRON: 23490,
  PT1: 6800,
  PT1S: 7000,
  ATV125: 15500,
  ATV125EFI: 17000,
  ATV200: 22788,
  ATVEFI200: 25000,
  NEWATV200EFI: 25000,
};

/* ================= NORMALIZAR FORTE ================= */
function normalizarModelo(modelo) {
  return (modelo || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acento
    .replace(/\s+/g, "") // remove espaços
    .replace(/[^A-Z0-9]/g, ""); // remove símbolos
}

/* ================= MAPA DE CORREÇÃO ================= */
const MAP_MODELOS = {
  JET125: "JET125SS",
  JET125SS2024: "JET125SS",
  JET125SSI: "JET125SS",

  SHI175EFI: "SHI175SEFI",
  SHI175CARBURADA: "SHI175",

  PHOENIX50: "PHOENIXS50",
  PHOENIX50EFI: "PHOENIX50SEFI",

  NEWJET: "NEWJET125",

  JEF150: "JEF150S",

  ATV200EFI: "ATVEFI200",
};

/* ================= FUNÇÃO PRINCIPAL ================= */
function getValorVendaModelo(modelo) {
  const original = modelo;

  const chaveNormalizada = normalizarModelo(modelo);

  const chaveFinal =
    MAP_MODELOS[chaveNormalizada] || chaveNormalizada;

  let valor = VALOR_VENDA_MODELOS[chaveFinal];

  if (!valor) {
    console.warn("⚠️ MODELO SEM VALOR:", original);
    console.warn("👉 Normalizado:", chaveNormalizada);
    console.warn("👉 Usado:", chaveFinal);
    console.warn("--------------------------");

    return 0;
  }

  return valor;
}

/* ================= ESTOQUE REAL ================= */
app.get("/estoque-motos-resumo", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT modelo, valor_compra
      FROM motos
      WHERE status = 'DISPONIVEL'
    `);

    let totalCompra = 0;
    let totalVenda = 0;

    result.rows.forEach((m) => {
      const compra = Number(m.valor_compra || 0);
      const venda = getValorVendaModelo(m.modelo);

      totalCompra += compra;
      totalVenda += venda;
    });

    res.json({
      totalCompra,
      totalVenda,
      quantidade: result.rows.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar estoque" });
  }
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
  [normModeloKey("SHI 175 CARB")]:12900,
  [normModeloKey("NEW JET 125")]:9500,
  [normModeloKey("URBAN 150 EFI")]:18100,
  [normModeloKey("IRON 250")]:19600,
  [normModeloKey("ATV 125 EFI")]:16000,
  [normModeloKey("PT2XS")]:6200,
  [normModeloKey("PT1")]:5590,
  [normModeloKey("PT1S")]:5790,
  [normModeloKey("NEW JEF")]:12600,
  [normModeloKey("PHOENIX 50S")]:7100,
  [normModeloKey("JEF 150 EFI")]:13800,
  [normModeloKey("ATV 200 EFI")]:23000,
  [normModeloKey("NEW JET 125 EFI")]:14600,
  [normModeloKey("PT4 PRO")]:8300,
  [normModeloKey("PT3 TRICICLO")]:11590,
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

function isDiretoria(req) {
  const role = String(req.query.role || req.headers["x-role"] || "").toUpperCase();
  return role === "DIRETORIA";
}

app.get("/estoque-motos-resumo", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        modelo,
        valor_compra,
        repasse
      FROM motos
      WHERE status = 'DISPONIVEL'
    `);

    let totalCompra = 0;
    let totalVenda = 0;

    result.rows.forEach(m => {
      const compra = Number(m.valor_compra || 0);
      const venda = Number(m.repasse || 0);

      totalCompra += compra;
      totalVenda += venda;
    });

    res.json({
      totalCompra,
      totalVenda,
      quantidade: result.rows.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erro ao buscar estoque" });
  }
});

/* ================= EMPLACAMENTOS ================= */

// LISTAR
app.get("/emplacamentos", async (req, res) => {
  try {
    if (!isDiretoria(req)) return res.status(403).json({ message: "Acesso negado" });

    const r = await db.query(`
      SELECT
        id,
        cliente,
        moto,
        cidade,
        data,
        valor,
        custo,
        (COALESCE(valor,0) - COALESCE(custo,0)) AS loja,
        forma_pagamento,
        pago,
        entregue,
        created_at
      FROM emplacamentos
      ORDER BY data DESC NULLS LAST, id DESC
    `);

    res.json(r.rows);
  } catch (err) {
    console.error("Erro emplacamentos (GET):", err);
    res.status(500).json({ message: "Erro ao buscar emplacamentos" });
  }
});

// CADASTRAR (não recebe pago/entregue)
app.post("/emplacamentos", async (req, res) => {
  try {
    if (!isDiretoria(req)) return res.status(403).json({ message: "Acesso negado" });

    const { cliente, moto, cidade, data, valor, custo, forma_pagamento } = req.body;

    if (!cliente || !moto || !cidade || !data || valor == null || custo == null) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const r = await db.query(
      `INSERT INTO emplacamentos (cliente, moto, cidade, data, valor, custo, forma_pagamento, pago, entregue)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,false)
       RETURNING id`,
      [
        String(cliente).trim(),
        String(moto).trim(),
        String(cidade).trim(),
        data, // YYYY-MM-DD
        Number(valor),
        Number(custo),
        forma_pagamento ? String(forma_pagamento).trim() : null,
      ]
    );

    res.json({ message: "Emplacamento cadastrado", id: r.rows[0].id });
  } catch (err) {
    console.error("Erro emplacamentos (POST):", err);
    res.status(500).json({ message: "Erro ao cadastrar emplacamento" });
  }
});

// EDITAR (aqui salva pago/entregue também)
app.put("/emplacamentos/:id", async (req, res) => {
  try {
    if (!isDiretoria(req)) return res.status(403).json({ message: "Acesso negado" });

    const { id } = req.params;

    const {
      cliente,
      moto,
      cidade,
      data,
      valor,
      custo,
      forma_pagamento,
      pago,
      entregue,
    } = req.body;

    if (!cliente || !moto || !cidade || !data || valor == null || custo == null) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const r = await db.query(
      `UPDATE emplacamentos
       SET cliente = $1,
           moto = $2,
           cidade = $3,
           data = $4,
           valor = $5,
           custo = $6,
           forma_pagamento = $7,
           pago = $8,
           entregue = $9
       WHERE id = $10
       RETURNING id`,
      [
        String(cliente).trim(),
        String(moto).trim(),
        String(cidade).trim(),
        data, // YYYY-MM-DD
        Number(valor),
        Number(custo),
        forma_pagamento ? String(forma_pagamento).trim() : null,
        Boolean(pago),
        Boolean(entregue),
        Number(id),
      ]
    );

    if (r.rowCount === 0) return res.status(404).json({ message: "Emplacamento não encontrado" });

    res.json({ message: "Emplacamento atualizado", id: r.rows[0].id });
  } catch (err) {
    console.error("Erro emplacamentos (PUT):", err);
    res.status(500).json({ message: "Erro ao atualizar emplacamento" });
  }
});

// (Opcional) DELETAR
app.delete("/emplacamentos/:id", async (req, res) => {
  try {
    if (!isDiretoria(req)) return res.status(403).json({ message: "Acesso negado" });

    const { id } = req.params;
    await db.query(`DELETE FROM emplacamentos WHERE id = $1`, [id]);
    res.json({ message: "Removido" });
  } catch (err) {
    console.error("Erro emplacamentos (DELETE):", err);
    res.status(500).json({ message: "Erro ao remover" });
  }
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

/* ================= ALTERAR STATUS MOTO ================= */
app.put("/motos/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusFinal = String(status || "").toUpperCase();
  const statusPermitidos = ["DISPONIVEL", "NEGOCIACAO", "PENDENTE_APROVACAO", "VENDIDA"];

  const userId = Number(req.headers["x-user-id"]);
  const role = String(req.headers["x-role"] || "").toUpperCase();

  if (!statusPermitidos.includes(statusFinal)) {
    return res.status(400).json({ message: "Status inválido" });
  }

  if (!userId) {
    return res.status(400).json({ message: "Usuário não identificado" });
  }

  try {
    const motoRes = await db.query(
      `SELECT id, status, negociacao_por
       FROM motos
       WHERE id = $1`,
      [id]
    );

    if (motoRes.rows.length === 0) {
      return res.status(404).json({ message: "Moto não encontrada" });
    }

    const moto = motoRes.rows[0];

    // Entrar em negociação
    if (statusFinal === "NEGOCIACAO") {
      const r = await db.query(
        `UPDATE motos
         SET status = $1,
             negociacao_por = $2,
             negociacao_em = NOW()
         WHERE id = $3
         RETURNING *`,
        ["NEGOCIACAO", userId, id]
      );

      return res.json({
        message: "Moto colocada em negociação com sucesso",
        moto: r.rows[0],
      });
    }

    // Sair de negociação
    if (statusFinal === "DISPONIVEL" && moto.status === "NEGOCIACAO") {
      const podeLiberar =
        role === "DIRETORIA" || Number(moto.negociacao_por) === userId;

      if (!podeLiberar) {
        return res.status(403).json({
          message: "Apenas quem colocou em negociação ou a diretoria pode liberar",
        });
      }

      const r = await db.query(
        `UPDATE motos
         SET status = $1,
             negociacao_por = NULL,
             negociacao_em = NULL
         WHERE id = $2
         RETURNING *`,
        ["DISPONIVEL", id]
      );

      return res.json({
        message: "Moto liberada com sucesso",
        moto: r.rows[0],
      });
    }

    // Outros status
    const r = await db.query(
      `UPDATE motos
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [statusFinal, id]
    );

    return res.json({
      message: "Status atualizado com sucesso",
      moto: r.rows[0],
    });
  } catch (err) {
    console.error("Erro atualizar status moto:", err);
    return res.status(500).json({ message: "Erro ao atualizar status da moto" });
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
        negociacao_por,
        negociacao_em,
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
app.get("/vendas", async (req, res) => {
  try {
    const vendasRes = await db.query(
      `SELECT 
         id,
         cliente_nome,
         cliente_telefone,
         total,
         created_at,
         cidade,
         forma_pagamento,
         observacao,
         modelo_moto,
         chassi_moto,
         km,
         rp
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

/* ================= EDITAR VENDA (PEÇAS) ================= */
app.put("/vendas/:id", async (req, res) => {
  const { id } = req.params;

  const {
    cliente_nome,
    cliente_telefone,
    forma_pagamento,
    cidade,
    observacao,
    modelo_moto,
    chassi_moto,
    km,
    total,
    rp,
  } = req.body;

  try {
    const vendaExiste = await db.query(
      `SELECT id FROM vendas WHERE id = $1`,
      [id]
    );

    if (vendaExiste.rows.length === 0) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    const result = await db.query(
      `UPDATE vendas
       SET cliente_nome = $1,
           cliente_telefone = $2,
           forma_pagamento = $3,
           cidade = $4,
           observacao = $5,
           modelo_moto = $6,
           chassi_moto = $7,
           km = $8,
           total = $9,
           rp = $10
       WHERE id = $11
       RETURNING *`,
      [
        cliente_nome || null,
        cliente_telefone || null,
        forma_pagamento || null,
        cidade || null,
        observacao || null,
        modelo_moto || null,
        chassi_moto || null,
        km != null && km !== "" ? Number(km) : null,
        total != null && total !== "" ? Number(total) : 0,
        Boolean(rp),
        Number(id),
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro editar venda:", err);
    res.status(500).json({ message: "Erro ao editar venda" });
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
        cnpj_empresa,
        local_retirada,
        filial_retirada,
        data_venda,
        comissao_valor,
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
    local_retirada,
    filial_retirada,
    data_venda,
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

    if (moto.status !== "DISPONIVEL") {
      throw new Error("Moto indisponível");
    }

let repasseFinal = moto.repasse ?? null;

if (isFilialRepasseSantanderObrigatorio(filial_venda)) {
  const r = repasseSantanderPorModelo(moto.modelo);
  if (typeof r !== "number") {
    throw new Error(`Repasse Santander não configurado para o modelo: ${moto.modelo}`);
  }
  repasseFinal = Number(r);
}
  const comissaoValor = calcularComissaoMoto(moto.modelo, valor)
    
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
        local_retirada,
        filial_retirada,
        data_venda,
        comissao_valor,
        status
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,
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
        local_retirada || null,
        filial_retirada || null,
        data_venda || new Date,
        comissaoValor || 0,
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
        repasse,
        local_retirada,
        filial_retirada,
        data_venda,
        comissao_valor
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
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
        repasseFinal,
        p.local_retirada || null,
        p.filial_retirada || null,
        p.data_venda || p.created_at,
        p.comissao_valor || 0,
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
