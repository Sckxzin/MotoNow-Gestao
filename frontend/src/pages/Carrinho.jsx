import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [itens, setItens] = useState([]);

  // 🔹 Dados do cliente (PEÇAS)
  const [nomeCliente, setNomeCliente] = useState("");
  const [cpf, setCpf] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacao, setObservacao] = useState("");


  /* ================= LOAD CARRINHO ================= */
  useEffect(() => {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    setItens(carrinho);
  }, []);

  function atualizarCarrinho(novo) {
    setItens(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
  }

  function alterarQtd(index, qtd) {
    const novo = [...itens];
    novo[index].quantidade = Number(qtd);
    atualizarCarrinho(novo);
  }

  function alterarPreco(index, preco) {
    const novo = [...itens];
    novo[index].preco_unitario = Number(preco);
    atualizarCarrinho(novo);
  }

  function remover(index) {
    atualizarCarrinho(itens.filter((_, i) => i !== index));
  }

  const total = itens.reduce(
    (s, i) => s + i.quantidade * i.preco_unitario,
    0
  );

  /* ================= FINALIZAR VENDA ================= */
  async function finalizarVenda() {
    if (itens.length === 0) {
      alert("Carrinho vazio");
      return;
    }

    if (!nomeCliente || !cpf || !formaPagamento) {
      alert("Preencha nome, CPF e forma de pagamento");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      await api.post("/finalizar-venda", {
        tipo: "PECA",
        cliente_nome: nomeCliente,
        cliente_cpf: cpf,
        forma_pagamento: formaPagamento,
        total,
        itens,
        cidade: user.cidade,
        observacao
        
        
      });

      localStorage.removeItem("carrinho");
      alert("Venda finalizada com sucesso!");
      nav("/home");
    } catch (err) {
      console.error("Erro ao finalizar venda:", err);
      alert("Erro ao finalizar venda");
    }
  }

  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Peças</h2>

      {itens.length === 0 ? (
        <p>Carrinho vazio</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Peça</th>
                <th>Qtd</th>
                <th>Preço</th>
                <th>Subtotal</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i, index) => (
                <tr key={index}>
                  <td>{i.nome}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={i.quantidade}
                      onChange={e => alterarQtd(index, e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={i.preco_unitario}
                      onChange={e => alterarPreco(index, e.target.value)}
                    />
                  </td>
                  <td>
                    R$ {(i.quantidade * i.preco_unitario).toFixed(2)}
                  </td>
                  <td>
                    <button onClick={() => remover(index)}>❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Total: R$ {total.toFixed(2)}</h3>

          {/* ================= DADOS DO CLIENTE ================= */}
          <h3>👤 Dados do Cliente</h3>

          <input
            placeholder="Nome do cliente"
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
          />

          <input
            placeholder="CPF"
            value={cpf}
            onChange={e => setCpf(e.target.value)}
          />

          <input
            placeholder="Forma de pagamento"
            value={formaPagamento}
            onChange={e => setFormaPagamento(e.target.value)}
          />
          <textarea
  placeholder="Observações da venda (ex: desconto, troca, cliente voltou depois...)"
  value={observacao}
  onChange={e => setObservacao(e.target.value)}
  rows={4}
/>


          <br /><br />

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✅ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
