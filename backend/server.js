require("dotenv").config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

// ⚠️ CONFIGURAÇÃO FIXA DO FREESQLDATABASE
const db = mysql.createConnection({
  host: "sql5.freesqldatabase.com",
  user: "sql5811685",
  password: "AMBiJinAHg",
  database: "sql5811685",
  port: 3306
});

// TESTAR CONEXÃO
db.connect(err => {
  if (err) {
    console.error("Erro ao conectar ao MySQL:", err);
  } else {
    console.log("✅ Conectado ao MySQL FreeSQLDatabase!");
  }
});

/* ------------------------ LOGIN ------------------------ */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM usuarios WHERE username = ? AND password = ?",
    [username, password],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0)
        return res.status(401).json({ message: "Usuário ou senha inválidos!" });

      const user = result[0];
      res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        filial: user.filial
      });
    }
  );
});

/* ------------------------ PEÇAS ------------------------ */
app.get("/pecas", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM pecas";
  let params = [];

  if (role !== "Diretoria") {
    sql = "SELECT * FROM pecas WHERE filial_atual = ?";
    params = [filial];
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

app.post("/pecas", (req, res) => {
  const { nome, codigo, quantidade, filial_atual } = req.body;

  db.query(
    "INSERT INTO pecas (nome, codigo, quantidade, filial_atual) VALUES (?, ?, ?, ?)",
    [nome, codigo, quantidade, filial_atual],
    err => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Peça cadastrada com sucesso!" });
    }
  );
});

/* ------------------------ VENDAS SIMPLES ------------------------ */
app.post("/vendas", (req, res) => {
  const { peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, filial } = req.body;

  db.query("SELECT * FROM pecas WHERE id = ?", [peca_id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Peça não encontrada!" });

    const peca = result[0];

    if (peca.quantidade < quantidade)
      return res.status(400).json({ message: "Quantidade insuficiente!" });

    const novaQtd = peca.quantidade - quantidade;

    db.query("UPDATE pecas SET quantidade = ? WHERE id = ?", [novaQtd, peca_id]);

    const total = quantidade * preco_unitario;

    db.query(
      `INSERT INTO vendas 
        (peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, total, filial)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, total, filial],
      (err, vendaRes) => {
        if (err) return res.status(500).json({ error: err });

        res.json({
          message: "Venda registrada com sucesso!",
          venda: vendaRes.insertId
        });
      }
    );
  });
});

app.get("/vendas", (req, res) => {
  const { role, filial } = req.query;

  let sql = `
      SELECT v.*, p.nome AS nome_peca, p.codigo AS codigo_peca
      FROM vendas v
      JOIN pecas p ON v.peca_id = p.id
  `;
  let params = [];

  if (role !== "Diretoria") {
    sql += " WHERE v.filial = ?";
    params = [filial];
  }

  sql += " ORDER BY v.data_venda DESC";

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

/* ------------------------ VENDA COM CARRINHO ------------------------ */
app.post("/venda-multipla", (req, res) => {
  const { cliente, filial, itens } = req.body;

  if (!itens || itens.length === 0)
    return res.status(400).json({ message: "Carrinho vazio!" });

  const totalVenda = itens.reduce(
    (sum, item) => sum + (item.preco_unitario * item.quantidade),
    0
  );

  db.query(
    "INSERT INTO vendas_multi (nome_cliente, telefone, cpf, total, filial) VALUES (?, ?, ?, ?, ?)",
    [cliente.nome, cliente.telefone, cliente.cpf, totalVenda, filial],
    (err, vendaRes) => {
      if (err) return res.status(500).json(err);

      const vendaId = vendaRes.insertId;

      itens.forEach(item => {
        db.query(
          `INSERT INTO venda_itens 
           (venda_id, peca_id, nome_peca, codigo_peca, quantidade, preco_unitario, subtotal)
           SELECT ?, p.id, p.nome, p.codigo, ?, ?, (? * ?) 
           FROM pecas p WHERE p.id = ?`,
          [
            vendaId,
            item.quantidade,
            item.preco_unitario,
            item.quantidade,
            item.preco_unitario,
            item.quantidade,
            item.peca_id
          ]
        );

        db.query(
          "UPDATE pecas SET quantidade = quantidade - ? WHERE id = ?",
          [item.quantidade, item.peca_id]
        );
      });

      res.json({
        message: "Venda realizada com sucesso!",
        venda_id: vendaId,
        total: totalVenda
      });
    }
  );
});

/* ------------------------ MOTOS ------------------------ */
app.post("/motos", (req, res) => {
  const { modelo, ano, cor, chassi, filial } = req.body;

  db.query(
    "INSERT INTO motos (modelo, ano, cor, chassi, filial) VALUES (?, ?, ?, ?, ?)",
    [modelo, ano, cor, chassi, filial],
    err => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Moto cadastrada!" });
    }
  );
});

app.get("/motos", (req, res) => {
  const { role, filial } = req.query;

  let sql = "SELECT * FROM motos";
  let params = [];

  if (role !== "Diretoria") {
    sql = "SELECT * FROM motos WHERE filial = ?";
    params = [filial];
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

/* ------------------------ BUSCAR MOTO POR ID ------------------------ */
app.get("/moto/:id", (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM motos WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Moto não encontrada" });

    res.json(result[0]);
  });
});

/* ------------------------ VENDER MOTO ------------------------ */
app.post("/vender-moto", (req, res) => {
  const { moto_id, nome_cliente, telefone, cpf, filial, gasolina, valor, capacete_brinde, chegada } = req.body;

  db.query("SELECT * FROM motos WHERE id = ?", [moto_id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.status(404).json({ message: "Moto não encontrada." });

    const moto = result[0];
    if (moto.status === "VENDIDA")
      return res.status(400).json({ message: "Essa moto já foi vendida." });

    // Registrar venda
    db.query(
      `INSERT INTO vendas_motos 
       (moto_id, nome_cliente, telefone, cpf, filial, gasolina, valor, capacete_brinde, chegada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [moto_id, nome_cliente, telefone, cpf, filial, gasolina, valor, capacete_brinde, chegada],
      (err, vendaRes) => {
        if (err) return res.status(500).json(err);

        const vendaId = vendaRes.insertId;

        // Baixa automática no capacete se for brinde
        if (capacete_brinde === "SIM") {
          db.query(
            `UPDATE pecas 
             SET quantidade = quantidade - 1 
             WHERE filial_atual = ? AND nome LIKE '%capacete%' 
             LIMIT 1`,
            [filial]
          );

          db.query(
            `INSERT INTO vendas_motos_itens
             (venda_id, descricao, quantidade, preco_unitario, subtotal)
             VALUES (?, 'Capacete (brinde)', 1, 0, 0)`,
            [vendaId]
          );
        }

        // Atualizar status da moto
        db.query("UPDATE motos SET status = 'VENDIDA' WHERE id = ?", [moto_id]);

        res.json({
          message: "Venda registrada com sucesso!",
          venda_id: vendaId,
          capacete: capacete_brinde === "SIM" ? "Baixa realizada" : "Sem brinde"
        });
      }
    );
  });
});


/* ------------------------ SERVIDOR ------------------------ */
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Servidor rodando na porta " + PORT);
});
