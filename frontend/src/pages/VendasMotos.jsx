import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);

  /* ================= HELPERS ================= */
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

  /* ================= FILTROS ================= */
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    api.get("/vendas-motos")
      .then(res => setVendas(res.data || []))
      .catch(() => alert("Erro ao carregar vendas"));
  }, []);

  /* ================= EMPRESA ================= */
  function getEmpresa(v) {
    return v.santander === true || v.santander === "SIM"
      ? "EMENEZES"
      : "MOTONOW";
  }

  /* ================= BOTÕES RÁPIDOS ================= */
  function aplicarHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    setDataInicio(hoje);
    setDataFim(hoje);
  }

  function aplicar7Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 7);

    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicar30Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 30);

    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicarMesAtual() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function limparDatas() {
    setDataInicio("");
    setDataFim("");
  }

  /* ================= FILTRAGEM ================= */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const empresa = getEmpresa(v);
      const dataVenda = new Date(v.created_at);

      const okEmpresa =
        empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade =
        cidadeFiltro === "TODAS" || v.filial_venda === cidadeFiltro;

      const okInicio =
        !dataInicio || dataVenda >= new Date(dataInicio);

      const okFim =
        !dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`);

      return okEmpresa && okCidade && okInicio && okFim;
    });
  }, [vendas, empresaFiltro, cidadeFiltro, dataInicio, dataFim]);

  /* ================= TOTAIS ================= */
  const totalEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor);
      else motonow += Number(v.valor);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>🏍 Histórico de Vendas de Motos</h2>
      <button onClick={() => nav("/home")}>⬅ Voltar</button>

      {/* ===== FILTROS ===== */}
      <div style={{ display: "flex", gap: 10, marginTop: 15, flexWrap: "wrap" }}>
        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <select value={cidadeFiltro} onChange={e => setCidadeFiltro(e.target.value)}>
          <option value="TODAS">Todas Cidades</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
        </select>

        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
      </div>

      {/* ===== BOTÕES RÁPIDOS ===== */}
      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={aplicarHoje}>Hoje</button>
        <button onClick={aplicar7Dias}>Últimos 7 dias</button>
        <button onClick={aplicar30Dias}>Últimos 30 dias</button>
        <button onClick={aplicarMesAtual}>Mês atual</button>
        <button onClick={limparDatas}>Limpar</button>
      </div>

      {/* ===== TOTAIS ===== */}
      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <strong>🏢 EMENEZES: {formatarValor(totalEmpresa.emenezes)}</strong>
        <strong>🏢 MOTONOW: {formatarValor(totalEmpresa.motonow)}</strong>
      </div>

      {/* ===== EXPORTAR ===== */}
      <button style={{ marginTop: 15 }}
        onClick={() =>
          exportarCSV(
            "historico_vendas_motos.csv",
            ["modelo", "cliente", "valor", "filial", "empresa", "data"],
            vendasFiltradas.map(v => ({
              modelo: v.modelo,
              cliente: v.nome_cliente,
              valor: v.valor,
              filial: v.filial_venda,
              empresa: getEmpresa(v),
              data: new Date(v.created_at).toLocaleDateString("pt-BR")
            }))
          )
        }
      >
        📥 Exportar CSV
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
              <th>Gasolina</th>
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

                <td>
                  {v.gasolina
                    ? `R$ ${Number(v.gasolina).toFixed(2)}`
                    : "-"}
                </td>

                <td>{v.filial_venda}</td>

                <td>{getEmpresa(v)}</td>

                <td>{v.brinde ? "SIM" : "NÃO"}</td>

                <td>
          ))}
        </tbody>
      </table>
    </div>
  );
}
