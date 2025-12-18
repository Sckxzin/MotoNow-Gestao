import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [cliente, setCliente] = useState({
    nome: "",
    telefone: "",
    cpf: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  /* ================= LOAD CARRINHO ================= */
  useEffect(() => {
    const c = JSON.parse(localStorage.getItem("carrinho")) || [];
    setCarrinho(c);
  }, []);

  function atualizarCarrinho(novo) {
    setCarrinho(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
  }

  function alterarQuantidade(index, qtd) {
    const novo = [...carrinho];
    novo[index].quantidade = Number(qtd);
    atualizarCarrinho(novo);
  }

  function removerItem(index) {
    const novo = carrinho.filter((_, i) => i !== index);
    atualizarCarrinho(novo);
  }

  const totalGeral = carrinho.reduce(
    (s, i) => s + i.quantidade * i.preco_unitario,
    0
  );

  /* ================= FINALIZAR VENDA ================= */
  async function finalizarVenda() {
    if (!cliente.nome || !cliente.cpf) {
      return alert("Preencha nome e CPF");
    }

    if (!formaPagamento) {
      return alert("Selecione a forma de pagamento");
    }

    if (carrinho.length === 0) {
      return alert("Carrinho vazio");
    }

    try {
      const payload = {
        cliente: {
          nome: cliente.nome,
          telefone: cliente.telefone,
          cpf: cliente.cpf
        },
        filial: user.filial,
        forma_pagamento: formaPagamento,
        itens: carrinho.map(item => ({
          peca_id: item.peca_id,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco_unitario)
        }))
      };

      const res = await api.post("/venda-multipla", payload);

      /* ===== NOTA FISCAL ===== */
      const nota = {
        venda_id: res.data.venda_id,
        data: new Date().toLocaleString(),
        cliente,
        filial: user.filial,
        forma_pagamento: formaPagamento,
        total: totalGeral,
        itens: carrinho.map(i => ({
          nome: i.nome,
          codigo: i.codigo,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          subtotal: i.quantidade * i.preco_unitario
        }))
      };

      localStorage.setItem("notaFiscal", JSON.stringify(nota));
      localStorage.removeItem("carrinho");

      alert("Venda concluída com sucesso!");
      nav("/nota");

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Erro ao finalizar venda");
    }
  }

  /* ================= RENDER ================= */
  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Vendas</h2>

      {carrinho.length === 0 ? (
        <h3>Carrinho vazio</h3>
      ) : (
        <>
          <table className="carrinho-table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Código</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Subtotal</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {carrinho.map((item, i) => (
                <tr key={i}>
                  <td>{item.nome}</td>
                  <td>{item.codigo}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={e =>
                        alterarQuantidade(i, e.target.value)
                      }
                    />
                  </td>
                  <td>R$ {Number(item.preco_unitario).toFixed(2)}</td>
                  <td>
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </td>
                  <td>
                    <button
                      className="btn-remover"
                      onClick={() => removerItem(i)}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Total Geral: R$ {totalGeral.toFixed(2)}</h2>

          {/* ===== CLIENTE ===== */}
          <div className="cliente-box">
            <h3>Dados do Cliente</h3>

            <input
              placeholder="Nome"
              value={cliente.nome}
              onChange={e =>
                setCliente({ ...cliente, nome: e.target.value })
              }
            />

            <input
              placeholder="Telefone"
              value={cliente.telefone}
              onChange={e =>
                setCliente({ ...cliente, telefone: e.target.value })
              }
            />

            <input
              placeholder="CPF"
              value={cliente.cpf}
              onChange={e =>
                setCliente({ ...cliente, cpf: e.target.value })
              }
            />
          </div>

          {/* ===== PAGAMENTO ===== */}
          <div className="cliente-box">
            <h3>Forma de Pagamento</h3>

            <select
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
            >
              <option value="">Selecione</option>
              <option value="DINHEIRO">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="CARTAO_DEBITO">Cartão Débito</option>
              <option value="CARTAO_CREDITO">Cartão Crédito</option>
              <option value="BOLETO">Boleto</option>
            </select>
          </div>

          {/* ===== ASSINATURA ===== */}
          <div style={{ marginTop: 30 }}>
            <p>__________________________________________</p>
            <p>Assinatura do Cliente</p>
          </div>

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✔ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
