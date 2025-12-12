const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});


db.connect(err => {
  if (err) console.error("Erro ao conectar ao MySQL:", err);
  else console.log("Conectado ao MySQL!");
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

// Listar peças com filtro de filial
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

// Cadastrar peça
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


/* ------------------------ VENDAS ------------------------ */

app.post("/vendas", (req, res) => {
  const { peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, filial } = req.body;

  // Verificar peça
  db.query("SELECT * FROM pecas WHERE id = ?", [peca_id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (result.length === 0)
      return res.status(404).json({ message: "Peça não encontrada!" });

    const peca = result[0];

    if (peca.quantidade < quantidade)
      return res.status(400).json({ message: "Quantidade insuficiente!" });

    const novaQtd = peca.quantidade - quantidade;

    // Atualizar estoque
    db.query(
      "UPDATE pecas SET quantidade = ? WHERE id = ?",
      [novaQtd, peca_id],
      err => {
        if (err) return res.status(500).json({ error: err });

        const total = quantidade * preco_unitario;

        // Registrar venda
        const sqlVenda = `
          INSERT INTO vendas 
          (peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, total, filial)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(
          sqlVenda,
          [peca_id, nome_cliente, telefone, cpf, quantidade, preco_unitario, total, filial],
          (err, vendaRes) => {
            if (err) return res.status(500).json({ error: err });

            res.json({
              message: "Venda registrada com sucesso!",
              venda: {
                id: vendaRes.insertId,
                nome_cliente,
                telefone,
                cpf,
                peca: peca.nome,
                codigo: peca.codigo,
                quantidade,
                preco_unitario,
                total,
                filial,
                data: new Date()
              }
            });
          }
        );
      }
    );
  });
});


// Listar vendas
app.get("/vendas", (req, res) => {
  const { role, filial } = req.query;

  let sql = `
      SELECT v.*, 
             p.nome AS nome_peca,
             p.codigo AS codigo_peca
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


// Buscar venda por ID
app.get("/vendas/:id", (req, res) => {
  db.query("SELECT * OF vendas WHERE id = ?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    if (!result.length)
      return res.status(404).json({ message: "Venda não encontrada" });

    res.json(result[0]);
  });
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


/* ------------------------ INICIAR SERVIDOR ------------------------ */
app.listen(5000, "0.0.0.0", () => {
  console.log("API rodando em http://0.0.0.0:5000");
});
