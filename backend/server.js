require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

/* ===================== DATABASE ===================== */
const db = mysql.createConnection({
  host: "sql5.freesqldatabase.com",
  user: "sql5811685",
  password: "AMBiJinAHg",
  database: "sql5811685",
  port: 3306
});

db.connect(err => {
  if (err) {
    console.error("❌ Erro MySQL:", err);
  } else {
    console.log("✅ MySQL conectado");
  }
});

/* ===================== LOGIN ===================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM usuarios WHERE username = ? AND password = ?",
    [username, password],
    (err, r) => {
      if (err) return res.status(500).json(err);
      if (r.length === 0)
        return res.status(401).json({ message: "Login inválido" });

      const u = r[0];
      res.json({
        id: u.id,
        username: u.username,
        role: u.role,
        filial: u.filial
      });
    }
  );
});

/* ===================== PEÇAS ===================== */
app.get("/pecas", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM pecas";
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE filial_atual = ?";
    params.push(filial);
  }

  db.query(sql, params, (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
});

app.post("/pecas", (req, res) => {
  const { nome, codigo, quantidade, filial_atual, valor } = req.body;

  db.query(
    "INSERT INTO pecas (nome, codigo, quantidade, filial_atual, valor) VALUES (?, ?, ?, ?, ?)",
    [nome, codigo, quantidade, filial_atual, valor],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Peça cadastrada!" });
    }
  );
});

/* ===================== VENDA MÚLTIPLA (CARRINHO) ===================== */
app.post("/venda-multipla", (req, res) => {
  const { cliente, filial, itens, forma_pagamento } = req.body;

  if (!itens || itens.length === 0)
    return res.status(400).json({ message: "Carrinho vazio" });

  const total = itens.reduce(
    (s, i) => s + i.preco_unitario * i.quantidade,
    0
  );

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    db.query(
      `INSERT INTO vendas_multi 
       (nome_cliente, telefone, cpf, total, forma_pagamento, filial) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        cliente.nome,
        cliente.telefone,
        cliente.cpf,
        total,
        forma_pagamento,
        filial
      ],
      (err, r) => {
        if (err) return db.rollback(() => res.status(500).json(err));

        const vendaId = r.insertId;
        let pendentes = itens.length;

        itens.forEach(item => {
          db.query(
            "SELECT quantidade FROM pecas WHERE id = ?",
            [item.peca_id],
            (err, q) => {
              if (
                err ||
                q.length === 0 ||
                q[0].quantidade < item.quantidade
              ) {
                return db.rollback(() =>
                  res.status(400).json({ message: "Estoque insuficiente" })
                );
              }

              db.query(
                "UPDATE pecas SET quantidade = quantidade - ? WHERE id = ?",
                [item.quantidade, item.peca_id],
                err => {
                  if (err)
                    return db.rollback(() => res.status(500).json(err));

                  db.query(
                    `INSERT INTO venda_itens
                     (venda_id, peca_id, nome_peca, codigo_peca, quantidade, preco_unitario, subtotal)
                     SELECT ?, id, nome, codigo, ?, ?, (? * ?)
                     FROM pecas WHERE id = ?`,
                    [
                      vendaId,
                      item.quantidade,
                      item.preco_unitario,
                      item.quantidade,
                      item.preco_unitario,
                      item.peca_id
                    ],
                    err => {
                      if (err)
                        return db.rollback(() =>
                          res.status(500).json(err)
                        );

                      pendentes--;
                      if (pendentes === 0) {
                        db.commit(err => {
                          if (err)
                            return db.rollback(() =>
                              res.status(500).json(err)
                            );

                          res.json({
                            message: "Venda concluída",
                            venda_id: vendaId,
                            total
                          });
                        });
                      }
                    }
                  );
                }
              );
            }
          );
        });
      }
    );
  });
});

/* ===================== MOTOS ===================== */
app.post("/motos", (req, res) => {
  const { modelo, ano, cor, chassi, filial, santander } = req.body;

  db.query(
    `INSERT INTO motos 
     (modelo, ano, cor, chassi, filial, santander, status) 
     VALUES (?, ?, ?, ?, ?, ?, 'DISPONIVEL')`,
    [modelo, ano, cor, chassi, filial, santander],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Moto cadastrada!" });
    }
  );
});

app.get("/motos", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM motos";
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE filial = ?";
    params.push(filial);
  }

  db.query(sql, params, (err, r) => {
    if (err) return res.status(500).json(err);
    res.json(r);
  });
});

/* ===================== VENDER MOTO ===================== */
app.post("/vender-moto", (req, res) => {
  const {
    moto_id,
    nome_cliente,
    telefone,
    cpf,
    filial,
    gasolina,
    valor,
    capacete_brinde,
    chegada
  } = req.body;

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    db.query(
      "SELECT status FROM motos WHERE id = ?",
      [moto_id],
      (err, r) => {
        if (err || r.length === 0)
          return db.rollback(() =>
            res.status(404).json({ message: "Moto não encontrada" })
          );

        if (r[0].status === "VENDIDA")
          return db.rollback(() =>
            res.status(400).json({ message: "Moto já vendida" })
          );

        db.query(
          `INSERT INTO vendas_motos
           (moto_id, nome_cliente, telefone, cpf, filial, gasolina, valor, capacete_brinde, chegada)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            moto_id,
            nome_cliente,
            telefone,
            cpf,
            filial,
            gasolina,
            valor,
            capacete_brinde,
            chegada
          ],
          err => {
            if (err)
              return db.rollback(() => res.status(500).json(err));

            db.query(
              "UPDATE motos SET status = 'VENDIDA' WHERE id = ?",
              [moto_id],
              err => {
                if (err)
                  return db.rollback(() => res.status(500).json(err));

                if (capacete_brinde === "SIM") {
                  db.query(
                    `UPDATE pecas 
                     SET quantidade = quantidade - 1
                     WHERE filial_atual = ? AND nome LIKE '%capacete%' 
                     LIMIT 1`,
                    [filial]
                  );
                }

                db.commit(err => {
                  if (err)
                    return db.rollback(() =>
                      res.status(500).json(err)
                    );

                  res.json({ message: "Moto vendida com sucesso" });
                });
              }
            );
          }
        );
      }
    );
  });
});

/* ===================== SERVIDOR ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server rodando na porta", PORT);
});
