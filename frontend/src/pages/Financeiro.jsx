 import { useEffect, useState } from "react";
import api from "../api";
import "./VendasMotos.css";

export default function Financeiro() {
  const [data, setData] = useState("");

  const [saldo, setSaldo] = useState(0);
  const [aReceber, setAReceber] = useState(0);

  const [estoqueCompra, setEstoqueCompra] = useState(0);
  const [estoqueVenda, setEstoqueVenda] = useState(0);
  const [qtdEstoque, setQtdEstoque] = useState(0);

  const [shineray, setShineray] = useState(0);
  const [eduardo, setEduardo] = useState(0);
  const [fornecedor, setFornecedor] = useState(0);

  function formatar(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  useEffect(() => {
    if (!data) return;

    async function carregarEstoque() {
      try {
        const res = await api.get(`/estoque-motos-resumo?data=${data}`);

        setEstoqueCompra(res.data.totalCompra);
        setEstoqueVenda(res.data.totalVenda);
        setQtdEstoque(res.data.quantidade);
      } catch (err) {
        console.error(err);
        alert("Erro ao carregar estoque");
      }
    }

    carregarEstoque();
  }, [data]);

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

  return (
    <div className="vendas-motos-container">

      <h2 className="vm-title">💰 Controle Financeiro</h2>

      <div className="vm-card">
        <label>📅 Data</label>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>

      <div className="vm-card">
        <div className="vm-filters-grid">

          <div className="vm-field">
            <label>Saldo</label>
            <input type="number" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
          </div>

          <div className="vm-field">
            <label>A Receber</label>
            <input type="number" value={aReceber} onChange={(e) => setAReceber(e.target.value)} />
          </div>

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
            <input type="number" value={shineray} onChange={(e) => setShineray(e.target.value)} />
          </div>

          <div className="vm-field">
            <label>Eduardo</label>
            <input type="number" value={eduardo} onChange={(e) => setEduardo(e.target.value)} />
          </div>

          <div className="vm-field">
            <label>Fornecedor</label>
            <input type="number" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} />
          </div>

        </div>
      </div>

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