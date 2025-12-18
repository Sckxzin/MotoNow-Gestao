require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// ================== MYSQL ==================
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE
});

db.connect(err => {
  if (err) {
    console.error("❌ Erro MySQL:", err);
  } else {
    console.log("✅ MySQL conectado");
  }
});

// ================== LOGIN ==================
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = `
    SELECT id, username, role, filial
    FROM usuarios
    WHERE username = ? AND password = ?
    LIMIT 1
  `;

  db.query(sql, [username, password], (err, result) => {
    if (err) {
      console.error("Erro login:", err);
      return res.status(500).json({ error: "Erro no servidor" });
    }

    if (result.length === 0) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    res.json(result[0]);
  });
});

// ================== PEÇAS ==================
app.get("/pecas", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM pecas";
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE filial_atual = ?";
    params.push(filial);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});

app.post("/pecas", (req, res) => {
  const { nome, codigo, quantidade, valor, filial_atual } = req.body;

  const sql = `
    INSERT INTO pecas (nome, codigo, quantidade, valor, filial_atual)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [nome, codigo, quantidade, valor, filial_atual],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Peça cadastrada" });
    }
  );
});

// ================== MOTOS ==================
app.get("/motos", (req, res) => {
  db.query("SELECT * FROM motos", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ================== VENDA MULTI (CARRINHO) ==================
app.post("/vendas-multi", (req, res) => {
  const { cliente, itens, filial, forma_pagamento } = req.body;

  if (!itens || itens.length === 0) {
    return res.status(400).json({ message: "Carrinho vazio" });
  }

  const total = itens.reduce(
    (sum, i) => sum + i.quantidade * i.preco_unitario,
    0
  );

  const sqlVenda = `
    INSERT INTO vendas_multi
    (nome_cliente, telefone, cpf, total, forma_pagamento, filial, data_venda)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
  `;

  db.query(
    sqlVenda,
    [
      cliente.nome,
      cliente.telefone,
      cliente.cpf,
      total,
      forma_pagamento,
      filial
    ],
    (err, result) => {
      if (err) {
        console.error("Erro venda:", err);
        return res.status(500).json(err);
      }

      const vendaId = result.insertId;

      itens.forEach(item => {
        db.query(
          `
          INSERT INTO venda_itens
          (venda_id, peca_id, nome_peca, codigo_peca, quantidade, preco_unitario, subtotal)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
          [
            vendaId,
            item.peca_id,
            item.nome,
            item.codigo,
            item.quantidade,
            item.preco_unitario,
            item.quantidade * item.preco_unitario
          ]
        );

        db.query(
          "UPDATE pecas SET quantidade = quantidade - ? WHERE id = ?",
          [item.quantidade, item.peca_id]
        );
      });

      res.json({
        message: "Venda concluída",
        venda_id: vendaId,
        total
      });
    }
  );
});

// ================== LISTAR VENDAS ==================
app.get("/vendas", (req, res) => {
  db.query(
    "SELECT * FROM vendas_multi ORDER BY data_venda DESC",
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// ================== SERVER ==================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
);
