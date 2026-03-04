/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [itens, setItens] = useState([]);

  // 🔹 Dados do cliente (PEÇAS)
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formaPagamento, setFormaPagamento] = useState(""); // agora será select
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
    novo[index].quantidade = Math.max(1, Number(qtd || 1));
    atualizarCarrinho(novo);
  }

  function alterarPreco(index, preco) {
    const novo = [...itens];
    novo[index].preco_unitario = Number(preco || 0);
    atualizarCarrinho(novo);
  }

  function remover(index) {
    atualizarCarrinho(itens.filter((_, i) => i !== index));
  }

  /* ================= REGRA DESCONTO (PIX / À VISTA) ================= */
  const FORMAS_PAGAMENTO = ["DÉBITO", "CRÉDITO", "PIX", "À VISTA"];

  function normText(s) {
    return String(s || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function isIsentoDesconto(itemNome) {
    const n = normText(itemNome);
    // isenção: óleo e revisão (aceita variações)
    return n.includes("OLEO") || n.includes("REVISAO");
  }

  function isDescontoAtivo(fp) {
    const f = normText(fp);
    return f === "PIX" || f === "A VISTA" || f === "À VISTA";
  }

  const totalBruto = useMemo(() => {
    return itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.preco_unitario || 0), 0);
  }, [itens]);

  const baseDesconto = useMemo(() => {
    // soma apenas itens elegíveis (não-óleo e não-revisão)
    return itens.reduce((s, i) => {
      const nome = i.nome || "";
      if (isIsentoDesconto(nome)) return s;
      return s + Number(i.quantidade || 0) * Number(i.preco_unitario || 0);
    }, 0);
  }, [itens]);

  const desconto = useMemo(() => {
    if (!isDescontoAtivo(formaPagamento)) return 0;
    // 5% somente em cima da base elegível
    return baseDesconto * 0.05;
  }, [formaPagamento, baseDesconto]);

  const totalFinal = useMemo(() => {
    const t = totalBruto - desconto;
    return t < 0 ? 0 : t;
  }, [totalBruto, desconto]);

  function formatarBRL(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

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

      // opcional: deixar registrado na observação
      const obsFinal =
        desconto > 0
          ? `${observacao ? observacao + " | " : ""}Desconto 5% aplicado em PIX/À VISTA (exceto Óleo/Revisão): -${formatarBRL(
              desconto
            )}`
          : observacao;

      const res = await api.post("/finalizar-venda", {
        tipo: "PECA",
        cliente_nome: nomeCliente,
        cliente_telefone: telefone,
        forma_pagamento: formaPagamento,
        total: Number(totalFinal.toFixed(2)), // ✅ envia o total já com desconto
        itens,
        cidade: user?.cidade,
        observacao: obsFinal,
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
                  <td>
                    {i.nome}
                    {isIsentoDesconto(i.nome) && (
                      <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.8 }}>
                        (sem desconto)
                      </span>
                    )}
                  </td>

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

                  <td>{formatarBRL(Number(i.quantidade) * Number(i.preco_unitario))}</td>

                  <td>
                    <button onClick={() => remover(index)}>❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totais */}
          <div style={{ marginTop: 12 }}>
            <h3>Total bruto: {formatarBRL(totalBruto)}</h3>

            {isDescontoAtivo(formaPagamento) ? (
              <>
                <div style={{ marginTop: 6 }}>
                  <strong>Base do desconto (exceto Óleo/Revisão):</strong> {formatarBRL(baseDesconto)}
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Desconto (5%):</strong> -{formatarBRL(desconto)}
                </div>
                <h3 style={{ marginTop: 10 }}>Total com desconto: {formatarBRL(totalFinal)}</h3>
              </>
            ) : (
              <h3 style={{ marginTop: 10 }}>Total: {formatarBRL(totalFinal)}</h3>
            )}
          </div>

          {/* ================= DADOS DO CLIENTE ================= */}
          <h3 style={{ marginTop: 18 }}>👤 Dados do Cliente</h3>

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

          {/* ✅ Select com formas padrão */}
          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            style={{ marginTop: 8 }}
          >
            <option value="">Selecione a forma de pagamento</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          {isDescontoAtivo(formaPagamento) && (
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
              ✅ Desconto automático de 5% ativo (exceto Óleo/Revisão)
            </div>
          )}

          <textarea
            placeholder="Observações da venda (ex: desconto, troca, cliente voltou depois...)"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={4}
            style={{ marginTop: 8 }}
          />

          <input
            placeholder="KM rodados"
            value={km}
            onChange={e => setKm(e.target.value)}
          />

          {/* ================= DADOS DA MOTO (OPCIONAL) ================= */}
          <h3 style={{ marginTop: 18 }}>🏍 Dados da Moto (opcional)</h3>

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