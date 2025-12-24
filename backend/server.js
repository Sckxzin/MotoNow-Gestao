require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const db = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log("✅ PostgreSQL conectado (Supabase)"))
  .catch(err => console.error("❌ Erro ao conectar PG:", err));

});

/* ===================== LOGIN ===================== */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

 app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query(
      "SELECT id, username, role, cidade FROM usuarios WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Usuário ou senha inválidos" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro login:", err);
    res.status(500).json({ message: "Erro no servidor" });
  }
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

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/pecas", (req, res) => {
  const { nome, codigo, quantidade, filial_atual, valor } = req.body;

  db.query(
    `INSERT INTO pecas (nome, codigo, quantidade, filial_atual, valor)
     VALUES (?, ?, ?, ?, ?)`,
    [nome, codigo, quantidade, filial_atual, valor],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Peça cadastrada com sucesso" });
    }
  );
});

/* ===================== VENDA MULTIPLA (CARRINHO) ===================== */
app.post("/venda-multipla", (req, res) => {
  const {
    cliente,
    filial,
    itens,
    forma_pagamento,
    revisao,
    modelo_moto,
    chassi
  } = req.body;

  // Validações básicas
  if (!cliente || !cliente.nome) {
    return res.status(400).json({ message: "Cliente inválido" });
  }

  if (!itens || itens.length === 0) {
    return res.status(400).json({ message: "Carrinho vazio" });
  }

  if (revisao === true && (!modelo_moto || !chassi)) {
    return res.status(400).json({ message: "Modelo e chassi obrigatórios na revisão" });
  }

  const total = itens.reduce(
    (s, i) => s + Number(i.preco_unitario) * Number(i.quantidade),
    0
  );

  db.beginTransaction(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Erro ao iniciar transação" });
    }

    // 🔹 INSERE VENDA PRINCIPAL
    db.query(
      `INSERT INTO vendas_multi
       (nome_cliente, telefone, cpf, total, forma_pagamento, filial, revisao, modelo_moto, chassi, data_venda)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        cliente.nome,
        cliente.telefone,
        cliente.cpf,
        total,
        forma_pagamento,
        filial,
        revisao ? "SIM" : "NAO",
        modelo_moto || null,
        chassi || null
      ],
      (err, result) => {
        if (err) {
          console.error(err);
          return db.rollback(() =>
            res.status(500).json({ message: "Erro ao criar venda" })
          );
        }

        const vendaId = result.insertId;

        // 🔹 PROCESSA ITENS UM A UM
        const processarItem = index => {
          if (index >= itens.length) {
            return db.commit(err => {
              if (err) {
                console.error(err);
                return db.rollback(() =>
                  res.status(500).json({ message: "Erro ao finalizar venda" })
                );
              }
              res.json({ venda_id: vendaId, total });
            });
          }

          const item = itens[index];

          db.query(
            "SELECT quantidade FROM pecas WHERE id = ?",
            [item.peca_id],
            (err, rows) => {
              if (err || rows.length === 0) {
                return db.rollback(() =>
                  res.status(400).json({ message: "Peça não encontrada" })
                );
              }

              if (rows[0].quantidade < item.quantidade) {
                return db.rollback(() =>
                  res.status(400).json({ message: "Estoque insuficiente" })
                );
              }

              db.query(
                "UPDATE pecas SET quantidade = quantidade - ? WHERE id = ?",
                [item.quantidade, item.peca_id],
                err => {
                  if (err) {
                    return db.rollback(() =>
                      res.status(500).json({ message: "Erro ao baixar estoque" })
                    );
                  }

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
                      if (err) {
                        return db.rollback(() =>
                          res.status(500).json({ message: "Erro ao salvar item" })
                        );
                      }
                      processarItem(index + 1);
                    }
                  );
                }
              );
            }
          );
        };

        processarItem(0);
      }
    );
  });
});



/* ===================== MOTOS ===================== */
app.get("/motos", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM motos";
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE filial = ?";
    params.push(filial);
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post("/motos", (req, res) => {
  const { modelo, ano, cor, chassi, filial, santander } = req.body;

  db.query(
    `INSERT INTO motos 
     (modelo, ano, cor, chassi, filial, santander, status)
     VALUES (?, ?, ?, ?, ?, ?, 'DISPONIVEL')`,
    [modelo, ano, cor, chassi, filial, santander],
    err => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Moto cadastrada" });
    }
  );
});

/* ===================== VENDER MOTO ===================== */
app.post("/vender-moto", (req, res) => {
  const {
    moto_id,
    nome_cliente,
    telefone,
    cpf,
    filial,
    valor,
    capacete_brinde
  } = req.body;

  db.beginTransaction(err => {
    if (err) return res.status(500).json(err);

    db.query(
      "UPDATE motos SET status = 'VENDIDA' WHERE id = ? AND status = 'DISPONIVEL'",
      [moto_id],
      (err, result) => {
        if (err || result.affectedRows === 0) {
          return db.rollback(() =>
            res.status(400).json({ message: "Moto indisponível" })
          );
        }

        db.query(
          `INSERT INTO vendas_motos 
           (moto_id, nome_cliente, telefone, cpf, filial, valor, data_venda)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [moto_id, nome_cliente, telefone, cpf, filial, valor],
          err => {
            if (err) return db.rollback(() => res.status(500).json(err));

            if (capacete_brinde === "SIM") {
              db.query(
                `UPDATE pecas SET quantidade = quantidade - 1
                 WHERE filial_atual = ? AND nome LIKE '%capacete%' LIMIT 1`,
                [filial]
              );
            }

            db.commit(err => {
              if (err) return db.rollback(() => res.status(500).json(err));
              res.json({ message: "Moto vendida com sucesso" });
            });
          }
        );
      }
    );
  });
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log("🚀 API rodando na porta", PORT)
);
