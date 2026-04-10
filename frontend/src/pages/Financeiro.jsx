import { useEffect, useState } from "react";
import api from "../api";
import "./VendasMotos.css";

export default function Financeiro() {
  /* ================= STATES ================= */
  const [data, setData] = useState("");

  const [saldo, setSaldo] = useState(0);
  const [aReceber, setAReceber] = useState(0);

  const [estoqueCompra, setEstoqueCompra] = useState(0);
  const [estoqueVenda, setEstoqueVenda] = useState(0);
  const [qtdEstoque, setQtdEstoque] = useState(0);

  const [shineray, setShineray] = useState(0);
  const [eduardo, setEduardo] = useState(0);
  const [fornecedor, setFornecedor] = useState(0);

  /* ================= FORMAT ================= */
  function formatar(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /* ================= ESTOQUE AUTOMATICO ================= */
  useEffect(() => {
    async function carregarEstoque() {
      try {
        const res = await api.get("/estoque-motos-resumo");

        setEstoqueCompra(res.data.totalCompra || 0);
        setEstoqueVenda(res.data.totalVenda || 0);
        setQtdEstoque(res.data.quantidade || 0);

      } catch (err) {
        console.error("Erro estoque:", err);
        alert("Erro ao carregar estoque");
      }
    }

    carregarEstoque();
  }, []);

  /* ================= CALCULOS ================= */

  const jotaCompra =
    Number(saldo) +
    Number(aReceber) +
    Number(estoqueCompra) -
    Number(shineray) -
    Number(eduardo) -
    Number(fornecedor);

  const jotaVenda =
    Number(saldo) +
    Number(aReceber) +
    Number(estoqueVenda) -
    Number(shineray) -
    Number(eduardo) -
    Number(fornecedor);

  /* ================= UI ================= */

  return (
    <div className="vendas-motos-container">

      <h2 className="vm-title">💰 Controle Financeiro</h2>

      {/* DATA */}
      <div className="vm-card">
        <label>📅 Data de referência</label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>

      {/* INPUTS */}
      <div className="vm-card">
        <h3>📊 Valores</h3>

        <div className="vm-filters-grid">

          <div className="vm-field">
            <label>Saldo</label>
            <input
              type="number"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>A Receber</label>
            <input
              type="number"
              value={aReceber}
              onChange={(e) => setAReceber(e.target.value)}
            />
          </div>

          {/* ESTOQUE AUTOMATICO */}
          <div className="vm-field">
            <label>Estoque (Compra)</label>
            <div>{formatar(estoqueCompra)}</div>
          </div>

          <div className="vm-field">
            <label>Estoque (Venda)</label>
            <div>{formatar(estoqueVenda)}</div>
          </div>

          <div className="vm-field">
            <label>Qtd Motos</label>
            <div>{qtdEstoque}</div>
          </div>

          <div className="vm-field">
            <label>Shineray</label>
            <input
              type="number"
              value={shineray}
              onChange={(e) => setShineray(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>Eduardo</label>
            <input
              type="number"
              value={eduardo}
              onChange={(e) => setEduardo(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>Fornecedor</label>
            <input
              type="number"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            />
          </div>

        </div>
      </div>

      {/* RESULTADOS */}
      <div className="vm-stats">

        <div className="vm-stat vm-stat-highlight">
          <div className="vm-stat-label">🟢 JOTA COMPRA</div>
          <div className="vm-stat-value">{formatar(jotaCompra)}</div>
        </div>

        <div className="vm-stat vm-stat-highlight">
          <div className="vm-stat-label">🔵 JOTA VENDA</div>
          <div className="vm-stat-value">{formatar(jotaVenda)}</div>
        </div>

      </div>

    </div>
  );
}