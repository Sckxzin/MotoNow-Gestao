// src/pages/VendasMotos.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function VendasMotos() {
  const nav = useNavigate();

  const [vendas, setVendas] = useState([]);

  // 🔹 filtros
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  /* ===================== UTIL ===================== */
  function formatarValor(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [
      headers.join(";"),
      ...dados.map(row =>
        headers.map(h => `"${row[h] ?? ""}"`).join(";")
      )
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
  }

  // 🔹 empresa correta
  function getEmpresa(v) {
    return v.santander === true || v.santander === "SIM"
      ? "EMENEZES"
      : "MOTONOW";
  }

  // 🔹 filtro por período (calendário)
  function filtrarPorPeriodo(dataVenda) {
    if (!dataInicio && !dataFim) return true;

    const data = new Date(dataVenda);

    if (dataInicio && data < new Date(dataInicio)) return false;
    if (dataFim && data > new Date(dataFim + "T23:59:59")) return false;

    return true;
  }

  /* ===================== LOAD ===================== */
  useEffect(() => {
    api
      .get("/vendas-motos")
      .then(res => setVendas(res.data || []))
      .catch(err => {
        console.error(err);
        alert("Erro ao carregar histórico de motos");
      });
  }, []);

  /* ===================== FILTRO ===================== */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const empresa = getEmpresa(v);

      const okEmpresa =
        empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade =
        cidadeFiltro === "TODAS" || v.filial_venda === cidadeFiltro;

      const okPeriodo = filtrarPorPeriodo(v.created_at);

      return okEmpresa && okCidade && okPeriodo;
    });
  }, [vendas, empresaFiltro, cidadeFiltro, dataInicio, dataFim]);

  /* ===================== TOTAIS ===================== */
  const totalEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor);
      else motonow += Number(v.valor);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  /* ===================== JSX ===================== */
  return (
    <div style={{ padding: 20 }}>
      <h2>🏍 Histórico de Vendas de Motos</h2>

      <button onClick={() => nav("/home")}>⬅ Voltar</button>

      {/* ===== FILTROS ===== */}
      <div
        className="filtros-historico"
        style={{ display: "flex", gap: 10, margin: "15px 0", flexWrap: "wrap" }}
      >
        <select
          value={empresaFiltro}
          onChange={e => setEmpresaFiltro(e.target.value)}
        >
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <select
          value={cidadeFiltro}
          onChange={e => setCidadeFiltro(e.target.value)}
        >
          <option value="TODAS">Todas Cidades</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
        </select>

        <input
          type="date"
          value={dataInicio}
          onChange={e => setDataInicio(e.target.value)}
        />

        <input
          type="date"
          value={dataFim}
          onChange={e => setDataFim(e.target.value)}
        />
      </div>

      {/* ===== TOTAIS ===== */}
      <div style={{ display: "flex", gap: 30, marginBottom: 20 }}>
        <div>
          <strong>🏢 EMENEZES</strong>
          <div>{formatarValor(totalEmpresa.emenezes)}</div>
        </div>

        <div>
          <strong>🏢 MOTONOW</strong>
          <div>{formatarValor(totalEmpresa.motonow)}</div>
        </div>
      </div>

      {/* ===== EXPORT ===== */}
      <button
        onClick={() =>
          exportarCSV(
            "historico_vendas_motos.csv",
            [
              "modelo",
              "cor",
              "chassi",
              "cliente",
              "valor",
              "pagamento",
              "filial",
              "empresa",
              "brinde",
              "data"
            ],
            vendasFiltradas.map(v => ({
              modelo: v.modelo,
              cor: v.cor,
              chassi: v.chassi,
              cliente: v.nome_cliente,
              valor: v.valor,
              pagamento: v.forma_pagamento,
              filial: v.filial_venda,
              empresa: getEmpresa(v),
              brinde: v.brinde ? "SIM" : "NÃO",
              data: new Date(v.created_at).toLocaleDateString("pt-BR")
            }))
          )
        }
      >
        📥 Exportar Histórico
      </button>

      {/* ===== TABELA ===== */}
      {vendasFiltradas.length === 0 ? (
        <p>Nenhuma venda encontrada.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Filial</th>
              <th>Empresa</th>
              <th>Brinde</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {vendasFiltradas.map(v => (
              <tr key={v.id}>
                <td>{v.modelo}</td>
                <td>{v.cor}</td>
                <td>{v.chassi}</td>
                <td>{v.nome_cliente}</td>
                <td>{formatarValor(v.valor)}</td>
                <td>{v.forma_pagamento}</td>
                <td>{v.filial_venda}</td>
                <td>{getEmpresa(v)}</td>
                <td>{v.brinde ? "SIM" : "NÃO"}</td>
                <td>
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}