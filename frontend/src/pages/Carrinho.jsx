import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [carrinho, setCarrinho] = useState([]);
  const [formaPagamento, setFormaPagamento] = useState("Pix");

  const [cliente, setCliente] = useState({
    nome: "",
    telefone: "",
    cpf: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  /* ================= LOAD ================= */
  useEffect(() => {
    const c = JSON.parse(localStorage.getItem("carrinho")) || [];
    setCarrinho(c);
  }, []);

  function atualizarCarrinho(novo) {
    setCarrinho(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
  }

  /* ================= ALTERAÇÕES ================= */
  function alterarQuantidade(index, valor) {
    const novo = [...carrinho];
    novo[index].quantidade = Number(valor);
    atualizarCarrinho(novo);
  }

  function alterarPreco(index, valor) {
    const novo = [...carrinho];
    novo[index].preco_unitario = Number(valor);
    atualizarCarrinho(novo);
  }

  function removerItem(index) {
    const novo = carrinho.filter((_, i) => i !== index);
    atualizarCarrinho(novo);
  }

  /* ================= TOTAIS ================= */
  const totalGeral = carrinho.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  /* ================= FINALIZAR ================= */
  async function finalizarVenda() {
    if (!cliente.nome || !cliente.cpf) {
      alert("Preencha nome e CPF do cliente");
      return;
    }

    if (carrinho.length === 0) {
      alert("Carrinho vazio");
      return;
    }

    try {
      const payload = {
        cliente,
        filial: user.filial,
        forma_pagamento: formaPagamento,
        itens: carrinho.map(item => ({
          peca_id: item.peca_id,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco_unitario)
        }))
      };

      // ✅ SEM VARIÁVEL "res" (corrige o build)
      await api.post("/venda-multipla", payload);

      localStorage.setItem(
        "notaFiscal",
        JSON.stringify({
          cliente,
          filial: user.filial,
          forma_pagamento: formaPagamento,
          total: totalGeral,
          data: new Date().toLocaleString(),
          itens: carrinho
        })
      );

      localStorage.removeItem("carrinho");
      nav("/nota");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar venda");
    }
  }

  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Vendas</h2>

      {carrinho.length === 0 ? (
        <h3 style={{ marginTop: 30 }}>Carrinho vazio</h3>
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
                      onChange={e => alterarQuantidade(i, e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={e => alterarPreco(i, e.target.value)}
                    />
                  </td>

                  <td>
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </td>

                  <td>
                    <button onClick={() => removerItem(i)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>Total Geral: R$ {totalGeral.toFixed(2)}</h2>

          <h3>Dados do Cliente</h3>
          <input
            placeholder="Nome"
            value={cliente.nome}
            onChange={e => setCliente({ ...cliente, nome: e.target.value })}
          />
          <input
            placeholder="Telefone"
            value={cliente.telefone}
            onChange={e => setCliente({ ...cliente, telefone: e.target.value })}
          />
          <input
            placeholder="CPF"
            value={cliente.cpf}
            onChange={e => setCliente({ ...cliente, cpf: e.target.value })}
          />

          <h3>Forma de Pagamento</h3>
          <select
            value={formaPagamento}
            onChange={e => setFormaPagamento(e.target.value)}
          >
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão">Cartão</option>
          </select>

          <div style={{ marginTop: 30 }}>
            _______________________________<br />
            Assinatura do Cliente
          </div>

          <button onClick={finalizarVenda} style={{ marginTop: 20 }}>
            ✔ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
