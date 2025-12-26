import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [itens, setItens] = useState([]);

  // 🔹 Dados da venda
  const [nomeCliente, setNomeCliente] = useState("");
  const [modelo, setModelo] = useState("");
  const [cor, setCor] = useState("");
  const [chassi, setChassi] = useState("");
  const [pagamento, setPagamento] = useState("");
  const [comoChegou, setComoChegou] = useState("");
  const [brinde, setBrinde] = useState(false);
  const [gasolina, setGasolina] = useState(false);

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

    if (!nomeCliente || !pagamento) {
      alert("Preencha nome do cliente e forma de pagamento");
      return;
    }

    try {
      await api.post("/finalizar-venda", {
        tipo: "PECA",
        nome_cliente: nomeCliente,
        modelo,
        cor,
        chassi,
        brinde,
        gasolina,
        forma_pagamento: pagamento,
        como_chegou: comoChegou,
        valor: total,
        itens
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
      <h2>🛒 Carrinho de Vendas</h2>

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

          {/* ================= DADOS DA VENDA ================= */}
          <h3>📋 Dados da Venda</h3>

          <input
            placeholder="Nome do Cliente"
            value={nomeCliente}
            onChange={e => setNomeCliente(e.target.value)}
          />

          <input
            placeholder="Modelo"
            value={modelo}
            onChange={e => setModelo(e.target.value)}
          />

          <input
            placeholder="Cor"
            value={cor}
            onChange={e => setCor(e.target.value)}
          />

          <input
            placeholder="Chassi"
            value={chassi}
            onChange={e => setChassi(e.target.value)}
          />

          <select value={pagamento} onChange={e => setPagamento(e.target.value)}>
            <option value="">Forma de Pagamento</option>
            <option value="Pix">Pix</option>
            <option value="Dinheiro">Dinheiro</option>
            <option value="Cartão">Cartão</option>
            <option value="Transferência">Transferência</option>
          </select>

          <select value={comoChegou} onChange={e => setComoChegou(e.target.value)}>
            <option value="">Como chegou?</option>
            <option value="Loja">Loja</option>
            <option value="Indicação">Indicação</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
          </select>

          <label>
            <input
              type="checkbox"
              checked={brinde}
              onChange={e => setBrinde(e.target.checked)}
            />
            Brinde
          </label>

          <label>
            <input
              type="checkbox"
              checked={gasolina}
              onChange={e => setGasolina(e.target.checked)}
            />
            Gasolina
          </label>

          <br /><br />

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✅ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
