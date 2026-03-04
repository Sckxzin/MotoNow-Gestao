/* eslint-disable no-unused-vars */
import { useEffect, useState, useMemo } from "react";
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

  /* ================= HELPERS ================= */
  function normText(s) {
    return String(s || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function isPixOuAVista(fp) {
    const t = normText(fp);
    // pega variações comuns
    return (
      t.includes("PIX") ||
      t.includes("A VISTA") ||
      t.includes("AVISTA") ||
      t.includes("A-VISTA") ||
      t.includes("À VISTA") ||
      t.includes("A VISTA")
    );
  }

  // ❌ itens que não entram no desconto (óleo e revisão)
  function isSemDesconto(item) {
    const nome = normText(item?.nome);
    // cobre "ÓLEO", "OLEO", "REVISAO", "REVISÃO", etc.
    return (
      nome.includes("OLEO") ||
      nome.includes("ÓLEO") ||
      nome.includes("REVISAO") ||
      nome.includes("REVISÃO") ||
      nome.includes("REVISAO") ||
      nome.includes("REVISA")
    );
  }

  function formatMoney(v) {
    const n = Number(v || 0);
    return `R$ ${n.toFixed(2)}`;
  }

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

  /* ================= TOTAIS + DESCONTO ================= */
  const subtotal = useMemo(() => {
    return itens.reduce((s, i) => s + Number(i.quantidade || 0) * Number(i.preco_unitario || 0), 0);
  }, [itens]);

  const subtotalElegivel = useMemo(() => {
    return itens.reduce((s, i) => {
      const itemTotal = Number(i.quantidade || 0) * Number(i.preco_unitario || 0);
      return isSemDesconto(i) ? s : s + itemTotal;
    }, 0);
  }, [itens]);

  const desconto = useMemo(() => {
    if (!isPixOuAVista(formaPagamento)) return 0;
    return subtotalElegivel * 0.05;
  }, [formaPagamento, subtotalElegivel]);

  const totalFinal = useMemo(() => {
    return Math.max(0, subtotal - desconto);
  }, [subtotal, desconto]);

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

      // adiciona uma linha na observação pra registrar o desconto aplicado
      const obsDesconto =
        desconto > 0
          ? `Desconto 5% (PIX/À vista) aplicado apenas em itens elegíveis: ${formatMoney(desconto)}.`
          : "";

      const observacaoFinal = [observacao, obsDesconto].filter(Boolean).join(" | ");

      const res = await api.post("/finalizar-venda", {
        tipo: "PECA",
        cliente_nome: nomeCliente,
        cliente_telefone: telefone,
        forma_pagamento: formaPagamento,
        total: Number(totalFinal.toFixed(2)), // ✅ envia total já com desconto
        itens,
        cidade: user?.cidade,
        observacao: observacaoFinal || null,
        modelo_moto: modeloMoto || null,
        chassi_moto: chassiMoto || null,
        km: km,
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
      alert(err?.response?.data?.message || "Erro ao finalizar venda");
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
                <th>Desconto?</th>
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
                      onChange={(e) => alterarQtd(index, e.target.value)}
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={i.preco_unitario}
                      onChange={(e) => alterarPreco(index, e.target.value)}
                    />
                  </td>

                  <td>R$ {(Number(i.quantidade || 0) * Number(i.preco_unitario || 0)).toFixed(2)}</td>

                  <td>{isSemDesconto(i) ? "NÃO (óleo/revisão)" : "SIM"}</td>

                  <td>
                    <button onClick={() => remover(index)}>❌</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* RESUMO */}
          <div style={{ marginTop: 12 }}>
            <h3>Subtotal: {formatMoney(subtotal)}</h3>

            {isPixOuAVista(formaPagamento) ? (
              <>
                <div>Base elegível p/ desconto (sem óleo/revisão): {formatMoney(subtotalElegivel)}</div>
                <div style={{ fontWeight: 700 }}>Desconto (5%): -{formatMoney(desconto)}</div>
              </>
            ) : (
              <div style={{ opacity: 0.8 }}>
                Desconto 5% só para PIX ou À vista (exceto óleo/revisão).
              </div>
            )}

            <h3 style={{ marginTop: 8 }}>Total final: {formatMoney(totalFinal)}</h3>
          </div>

          {/* ================= DADOS DO CLIENTE ================= */}
          <h3>👤 Dados do Cliente</h3>

          <input
            placeholder="Nome do cliente"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
          />

          <input
            placeholder="Telefone do cliente"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />

          <input
            placeholder="Forma de pagamento (PIX / À vista / cartão...)"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          />

          <textarea
            placeholder="Observações da venda (ex: desconto, troca, cliente voltou depois...)"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={4}
          />

          <input
            placeholder="KM rodados"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />

          {/* ================= DADOS DA MOTO (OPCIONAL) ================= */}
          <h3>🏍 Dados da Moto (opcional)</h3>

          <input
            placeholder="Modelo da moto (ex: SHI, JET...)"
            value={modeloMoto}
            onChange={(e) => setModeloMoto(e.target.value)}
          />

          <input
            placeholder="Chassi da moto"
            value={chassiMoto}
            onChange={(e) => setChassiMoto(e.target.value)}
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