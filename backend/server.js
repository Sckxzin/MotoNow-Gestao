require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

/* ================== MYSQL ================== */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error("❌ ERRO MYSQL:", err);
  } else {
    console.log("✅ MySQL conectado");
  }
});

/* ================== LOGIN ================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT id, username, role, filial FROM usuarios WHERE username = ? AND password = ?",
    [username, password],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Erro servidor" });
      if (rows.length === 0)
        return res.status(401).json({ message: "Usuário ou senha inválidos" });

      res.json(rows[0]);
    }
  );
});

/* ================== PEÇAS ================== */
app.get("/pecas", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM pecas";
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE filial_atual = ?";
    params.push(filial);
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows);
  });
});

/* ================== MOTOS ================== */
app.get("/motos", (req, res) => {
  db.query("SELECT * FROM motos", (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows);
  });
});

/* ================== VENDA MÚLTIPLA (CARRINHO) ================== */
app.post("/vendas-multi", (req, res) => {
  const { cliente, itens, filial, forma_pagamento } = req.body;

  if (!cliente || !itens || itens.length === 0)
    return res.status(400).json({ message: "Dados incompletos" });

  const total = itens.reduce(
    (s, i) => s + Number(i.quantidade) * Number(i.preco_unitario),
    0
  );

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Erro transação" });

    const sqlVenda = `
      INSERT INTO vendas_multi
      (nome_cliente, telefone, cpf, total, forma_pagamento, filial, data_venda)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;

    db.query(
      sqlVenda,
      [
        cliente.nome || "",
        cliente.telefone || "",
        cliente.cpf || "",
        total,
        forma_pagamento || "",
        filial
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error(err);
            res.status(500).json({ message: "Erro ao salvar venda" });
          });
        }

        const vendaId = result.insertId;

        const promises = itens.map(item => {
          return new Promise((resolve, reject) => {
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
              ],
              err => {
                if (err) return reject(err);

                db.query(
                  "UPDATE pecas SET quantidade = quantidade - ? WHERE id = ?",
                  [item.quantidade, item.peca_id],
                  err => {
                    if (err) return reject(err);
                    resolve();
                  }
                );
              }
            );
          });
        });

        Promise.all(promises)
          .then(() => {
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ message: "Erro commit" });
                });
              }

              res.json({
                message: "Venda finalizada com sucesso",
                venda_id: vendaId
              });
            });
          })
          .catch(err => {
            db.rollback(() => {
              console.error("ERRO ITEM:", err);
              res.status(500).json({ message: "Erro itens da venda" });
            });
          });
      }
    );
  });
});

/* ================== HISTÓRICO ================== */
app.get("/vendas", (req, res) => {
  db.query(
    "SELECT * FROM vendas_multi ORDER BY data_venda DESC",
    (err, rows) => {
      if (err) return res.status(500).json([]);
      res.json(rows);
    }
  );
});

/* ================== SERVER ================== */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () =>
  console.log(`🚀 Server rodando na porta ${PORT}`)
);
