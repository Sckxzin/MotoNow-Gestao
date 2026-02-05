import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "./VendasMotos.css";

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

  /* ================= CIDADES PADRÃO ================= */
  const cidadesPadrao = [
    "ESCADA",
    "IPOJUCA",
    "RIBEIRAO",
    "SAO JOSE",
    "CATENDE",
    "XEXEU",
    "MARAGOGI",
    "IPOJUCA RICARDO",
    "VALTER"
  ];

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

  function getCNPJ(v) {
    if (v.santander === true || v.santander === "SIM") {
      return "-";
    }
    return v.cnpj_empresa || "-";
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

  function aplicarMesPassado() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
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

      const okCidade = (() => {
        if (cidadeFiltro === "TODAS") return true;

        if (cidadeFiltro === "SEM_CIDADE") {
          return !v.filial_venda || v.filial_venda.trim() === "";
        }

        if (cidadeFiltro === "OUTRAS") {
          return (
            v.filial_venda &&
            !cidadesPadrao.includes(v.filial_venda)
          );
        }

        return v.filial_venda === cidadeFiltro;
      })();

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

  const totalPorCidade = useMemo(() => {
    const contagem = {};
    vendasFiltradas.forEach(v => {
      const cidade = v.filial_venda || "SEM CIDADE";
      contagem[cidade] = (contagem[cidade] || 0) + 1;
    });
    return contagem;
  }, [vendasFiltradas]);

  const totalGeralMotos = vendasFiltradas.length;

  /* ================= UI ================= */
  return (
    <div className="vendas-motos-container">
      <h2>🏍 Histórico de Vendas de Motos</h2>

      <button className="btn-voltar" onClick={() => nav("/home")}>
        ⬅ Voltar
      </button>

      {/* FILTROS */}
      <div className="filtros">
        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <select value={cidadeFiltro} onChange={e => setCidadeFiltro(e.target.value)}>
          <option value="TODAS">Todas Cidades</option>
          {cidadesPadrao.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
          <option value="OUTRAS">Outras cidades</option>
          <option value="SEM_CIDADE">Sem cidade</option>
        </select>

        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
      </div>

      {/* BOTÕES */}
      <div className="botoes-rapidos">
        <button onClick={aplicarHoje}>Hoje</button>
        <button onClick={aplicar7Dias}>7 dias</button>
        <button onClick={aplicar30Dias}>30 dias</button>
        <button onClick={aplicarMesAtual}>Mês atual</button>
        <button onClick={aplicarMesPassado}>Mês passado</button>
        <button onClick={limparDatas}>Limpar</button>
      </div>

      {/* RESUMO */}
      <div className="resumo">
        <strong>🏢 EMENEZES: {formatarValor(totalEmpresa.emenezes)}</strong>
        <strong>🏢 MOTONOW: {formatarValor(totalEmpresa.motonow)}</strong>
        <strong>🧮 Total: {totalGeralMotos} motos</strong>
      </div>
      {/* EXPORTAR CSV */}
<button
  className="btn-exportar"
  onClick={() =>
    exportarCSV(
      "historico_vendas_motos.csv",
      [
        "modelo",
        "cor",
        "chassi",
        "cliente",
        "telefone",
        "origem",
        "valor",
        "pagamento",
        "gasolina",
        "filial",
        "empresa",
        "cnpj",
        "brinde",
        "data"
      ],
      vendasFiltradas.map(v => ({
        modelo: v.modelo,
        cor: v.cor,
        chassi: v.chassi,
        cliente: v.nome_cliente,
        telefone: v.numero_cliente,
        origem: v.como_chegou,
        valor: Number(v.valor).toFixed(2),
        pagamento: v.forma_pagamento,
        gasolina: v.gasolina || "",
        filial: v.filial_venda,
        empresa: getEmpresa(v),
        cnpj: getCNPJ(v),
        brinde: v.brinde ? "SIM" : "NÃO",
        data: new Date(v.created_at).toLocaleDateString("pt-BR")
      }))
    )
  }
>
  📥 Exportar CSV
</button>


      {/* TABELA */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Origem</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Gasolina</th>
              <th>Filial</th>
              <th>Empresa</th>
              <th>CNPJ</th>
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
                <td>{v.numero_cliente}</td>
                <td>{v.como_chegou}</td>
                <td>{formatarValor(v.valor)}</td>
                <td>{v.forma_pagamento}</td>
                <td>{v.gasolina ? formatarValor(v.gasolina) : "-"}</td>
                <td>{v.filial_venda || "-"}</td>
                <td>{getEmpresa(v)}</td>
                <td>{getCNPJ(v)}</td>
                <td>{v.brinde ? "SIM" : "NÃO"}</td>
                <td>{new Date(v.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
