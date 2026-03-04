 import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "./VendasMotos.css";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);

  /* ================= HELPERS ================= */

  function formatarValor(valor) {
    if (valor == null || valor === "" || Number.isNaN(Number(valor))) return "-";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [
      headers.join(";"),
      ...dados.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
  }

  /* ================= FINANCEIRO ================= */

  // valor a repassar
  function getValorARepassar(v) {
    const repasse = Number(v.repasse || 0);

    if (!repasse || Number.isNaN(repasse)) return 0;

    const valorVenda = Number(v.valor || 0);

    return valorVenda - repasse;
  }

  // líquido
  function calcLiquido(v) {
    const valor = Number(v.valor || 0);
    const compra = Number(v.valor_compra || 0);
    const repasse = Number(v.repasse || 0);

    const aRepassar = getValorARepassar(v);

    const base = repasse > 0 ? repasse : compra;

    return valor - base - aRepassar;
  }

  /* ================= FILTROS ================= */

  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadesFiltro, setCidadesFiltro] = useState([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [buscaChassi, setBuscaChassi] = useState("");

  const [mostrarCidades, setMostrarCidades] = useState(false);

  const cidadesPadrao = [
    "ESCADA",
    "IPOJUCA",
    "RIBEIRAO",
    "SAO JOSE",
    "CATENDE",
    "XEXEU",
    "MARAGOGI",
    "IPOJUCA RICARDO",
    "CHA GRANDE"
  ];

  const opcoesCidades = [
    { value: "TODAS", label: "Todas cidades" },
    ...cidadesPadrao.map(c => ({ value: c, label: c })),
    { value: "OUTRAS", label: "Outras cidades" },
    { value: "SEM_CIDADE", label: "Sem cidade" }
  ];

  /* ================= LOAD ================= */

  useEffect(() => {
    api
      .get("/vendas-motos")
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
    if (v.santander === true || v.santander === "SIM") return "-";
    return v.cnpj_empresa || "-";
  }

  /* ================= FILTRAGEM ================= */

  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const empresa = getEmpresa(v);
      const dataVenda = new Date(v.created_at);

      const okEmpresa =
        empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade = (() => {
        if (cidadesFiltro.length === 0 || cidadesFiltro.includes("TODAS"))
          return true;

        const filial = (v.filial_venda || "").trim();

        if (cidadesFiltro.includes("SEM_CIDADE") && filial === "") return true;

        if (cidadesFiltro.includes("OUTRAS")) {
          if (filial !== "" && !cidadesPadrao.includes(filial)) return true;
        }

        const cidadesEspecificas = cidadesFiltro.filter(
          x => x !== "SEM_CIDADE" && x !== "OUTRAS" && x !== "TODAS"
        );

        if (
          cidadesEspecificas.length > 0 &&
          cidadesEspecificas.includes(filial)
        )
          return true;

        return false;
      })();

      const okInicio =
        !dataInicio || dataVenda >= new Date(dataInicio);

      const okFim =
        !dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`);

      const okBusca = (() => {
        if (!buscaChassi.trim()) return true;

        const termo = buscaChassi.trim().toLowerCase();

        const chassi = (v.chassi || "").toLowerCase();
        const modelo = (v.modelo || "").toLowerCase();
        const cliente = (v.nome_cliente || "").toLowerCase();

        return (
          chassi.includes(termo) ||
          modelo.includes(termo) ||
          cliente.includes(termo)
        );
      })();

      return okEmpresa && okCidade && okInicio && okFim && okBusca;
    });
  }, [vendas, empresaFiltro, cidadesFiltro, dataInicio, dataFim, buscaChassi]);

  /* ================= TOTAIS ================= */

  const totalLiquidoPorEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      const liq = calcLiquido(v);

      if (getEmpresa(v) === "EMENEZES") emenezes += liq;
      else motonow += liq;
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  /* ================= UI ================= */

  return (
    <div className="vendas-motos-container">

      <div className="vm-topbar">
        <div>
          <h2 className="vm-title">🏍 Histórico de Vendas de Motos</h2>
          <p className="vm-subtitle">
            Filtre rápido e exporte exatamente o que está na tela.
          </p>
        </div>

        <div className="vm-topbar-actions">
          <button className="vm-btn vm-btn-ghost" onClick={() => nav("/home")}>
            ⬅ Voltar
          </button>

          <button
            className="vm-btn vm-btn-primary"
            onClick={() =>
              exportarCSV(
                "historico_vendas_motos.csv",
                [
                  "modelo",
                  "cor",
                  "chassi",
                  "cliente",
                  "valor",
                  "valor_compra",
                  "repasse",
                  "a_repassar",
                  "liquido"
                ],
                vendasFiltradas.map(v => ({
                  modelo: v.modelo,
                  cor: v.cor,
                  chassi: v.chassi,
                  cliente: v.nome_cliente,
                  valor: Number(v.valor).toFixed(2),
                  valor_compra: Number(v.valor_compra).toFixed(2),
                  repasse: Number(v.repasse).toFixed(2),
                  a_repassar: Number(getValorARepassar(v)).toFixed(2),
                  liquido: Number(calcLiquido(v)).toFixed(2)
                }))
              )
            }
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="table-container vm-table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Compra</th>
              <th>Repasse</th>
              <th>A repassar</th>
              <th>Líquido</th>
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
                <td>{formatarValor(v.valor_compra)}</td>
                <td>{formatarValor(v.repasse)}</td>
                <td>{formatarValor(getValorARepassar(v))}</td>
                <td>{formatarValor(calcLiquido(v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}