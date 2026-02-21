import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [itens, setItens] = useState([]);

  // 🔹 Dados do cliente (PEÇAS)
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [modeloMoto, setModeloMoto] = useState("");
  const [chassiMoto, setChassiMoto] = useState("");
  const [km, setKm] = useState("");

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

  const total = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario, 0);

  /* ================= FINALIZAR VENDA ================= */
  async function finalizarVenda() {
    if (itens.length === 0) {
      alert("Carrinho vazio");
      return;
    }

    if (!nomeCliente || !telefone || !formaPagamento) {
      alert("Preencha nome, telefone e forma de pagamento");
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));

      const res = await api.post("/finalizar-venda", {
        tipo: "PECA",
        cliente_nome: nomeCliente,
        cliente_telefone: telefone,
        forma_pagamento: formaPagamento,
        total,
        itens,
        cidade: user?.cidade,
        observacao,
        modelo_moto: modeloMoto || null,
        chassi_moto: chassiMoto || null,
        km: km
      });

      const vendaId = res.data?.vendaId;

      localStorage.removeItem("carrinho");

      if (vendaId) {
        nav(`/nota?id=${vendaId}`);
      } else {
        alert("Venda finalizada, mas não retornou o ID da nota.");
        nav("/home");
      }
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

                  <td>R$ {(i.quantidade * i.preco_unitario).toFixed(2)}</td>

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
            placeholder="Telefone do cliente"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
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

          <input
            placeholder="KM rodados"
            value={km}
            onChange={e => setKm(e.target.value)}
          />
            
            

          {/* ================= DADOS DA MOTO (OPCIONAL) ================= */}
          <h3>🏍 Dados da Moto (opcional)</h3>

          <input
            placeholder="Modelo da moto (ex: SHI, JET...)"
            value={modeloMoto}
            onChange={e => setModeloMoto(e.target.value)}
          />

          <input
            placeholder="Chassi da moto"
            value={chassiMoto}
            onChange={e => setChassiMoto(e.target.value)}
          />

          <br />
          <br />

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✅ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
