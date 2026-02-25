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

  // ✅ valor a repassar: só calcula se tiver repasse
  function getValorARepassar(v) {
    const repasse = Number(v.repasse || 0);
    if (!repasse || Number.isNaN(repasse) || repasse <= 0) return null;

    const valorVenda = Number(v.valor || 0);
    return valorVenda - repasse;
  }

  // ✅ líquido do seu jeito (se tiver repasse, NÃO usa compra; se não tiver repasse, usa compra)
  function calcLiquido(v) {
    const valor = Number(v.valor || 0);
    const compra = Number(v.valor_compra || 0);
    const repasse = Number(v.repasse || 0);
    const gasolina = Number(v.gasolina || 0);
    const descontoBrinde = v.brinde ? 100 : 0;

    const base = repasse > 0 ? repasse : compra;

    return valor - base - gasolina - descontoBrinde;
  }

  /* ================= FILTROS ================= */
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadesFiltro, setCidadesFiltro] = useState([]); // array
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [buscaChassi, setBuscaChassi] = useState("");

  // UI (painel de filtros)
  const [mostrarCidades, setMostrarCidades] = useState(false);

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
    return v.santander === true || v.santander === "SIM" ? "EMENEZES" : "MOTONOW";
  }

  function getCNPJ(v) {
    if (v.santander === true || v.santander === "SIM") return "-";
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

  function limparCidades() {
    setCidadesFiltro([]);
  }

  function limparBusca() {
    setBuscaChassi("");
  }

  // checkbox multi
  function toggleCidade(valor) {
    // se marcar TODAS, limpa as outras e deixa só TODAS
    if (valor === "TODAS") {
      if (cidadesFiltro.includes("TODAS")) setCidadesFiltro([]);
      else setCidadesFiltro(["TODAS"]);
      return;
    }

    // se tiver TODAS selecionado e marcar outra, remove TODAS
    const base = cidadesFiltro.filter(x => x !== "TODAS");

    if (base.includes(valor)) {
      setCidadesFiltro(base.filter(x => x !== valor));
    } else {
      setCidadesFiltro([...base, valor]);
    }
  }

  function removerChip(valor) {
    setCidadesFiltro(prev => prev.filter(x => x !== valor));
  }

  /* ================= FILTRAGEM ================= */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const empresa = getEmpresa(v);
      const dataVenda = new Date(v.created_at);

      const okEmpresa = empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade = (() => {
        if (cidadesFiltro.length === 0 || cidadesFiltro.includes("TODAS")) return true;

        const filial = (v.filial_venda || "").trim();

        if (cidadesFiltro.includes("SEM_CIDADE") && filial === "") return true;

        if (cidadesFiltro.includes("OUTRAS")) {
          if (filial !== "" && !cidadesPadrao.includes(filial)) return true;
        }

        const cidadesEspecificas = cidadesFiltro.filter(
          x => x !== "SEM_CIDADE" && x !== "OUTRAS" && x !== "TODAS"
        );

        if (cidadesEspecificas.length > 0 && cidadesEspecificas.includes(filial)) return true;

        return false;
      })();

      const okInicio = !dataInicio || dataVenda >= new Date(dataInicio);
      const okFim = !dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`);

      const okBusca = (() => {
        if (!buscaChassi.trim()) return true;
        const termo = buscaChassi.trim().toLowerCase();

        const chassi = (v.chassi || "").toLowerCase();
        const modelo = (v.modelo || "").toLowerCase();
        const cliente = (v.nome_cliente || "").toLowerCase();

        return chassi.includes(termo) || modelo.includes(termo) || cliente.includes(termo);
      })();

      return okEmpresa && okCidade && okInicio && okFim && okBusca;
    });
  }, [vendas, empresaFiltro, cidadesFiltro, dataInicio, dataFim, buscaChassi]);

  /* ================= TOTAIS ================= */
  const totalEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor || 0);
      else motonow += Number(v.valor || 0);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  const totalGeralMotos = vendasFiltradas.length;

  const totalARepassarPorEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      const valorARepassar = getValorARepassar(v);
      if (valorARepassar == null) return;

      if (getEmpresa(v) === "EMENEZES") emenezes += valorARepassar;
      else motonow += valorARepassar;
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

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
      {/* TOPBAR */}
      <div className="vm-topbar">
        <div>
          <h2 className="vm-title">🏍 Histórico de Vendas de Motos</h2>
          <p className="vm-subtitle">Filtre rápido e exporte exatamente o que está na tela.</p>
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
                  "telefone",
                  "origem",
                  "valor",
                  "valor_compra",
                  "repasse",
                  "a_repassar",
                  "liquido",
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
                  valor: v.valor != null ? Number(v.valor).toFixed(2) : "",
                  valor_compra: v.valor_compra != null ? Number(v.valor_compra).toFixed(2) : "",
                  repasse: v.repasse != null ? Number(v.repasse).toFixed(2) : "",
                  a_repassar: getValorARepassar(v) == null ? "" : Number(getValorARepassar(v)).toFixed(2),
                  liquido: Number(calcLiquido(v)).toFixed(2),
                  pagamento: v.forma_pagamento,
                  gasolina: v.gasolina != null ? Number(v.gasolina).toFixed(2) : "",
                  filial: v.filial_venda || "",
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
        </div>
      </div>

      {/* CARD FILTROS */}
      <div className="vm-card">
        <div className="vm-filters-grid">
          <div className="vm-field">
            <label>Empresa</label>
            <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
              <option value="TODAS">Todas</option>
              <option value="EMENEZES">Emenezes</option>
              <option value="MOTONOW">MotoNow</option>
            </select>
          </div>

          <div className="vm-field">
            <label>Data início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>

          <div className="vm-field">
            <label>Data fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>

          <div className="vm-field vm-field-wide">
            <label>Busca</label>
            <input
              placeholder="Buscar por chassi, modelo ou cliente..."
              value={buscaChassi}
              onChange={e => setBuscaChassi(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>Cidades</label>
            <button
              type="button"
              className="vm-btn vm-btn-ghost vm-btn-full"
              onClick={() => setMostrarCidades(v => !v)}
            >
              {mostrarCidades ? "▲ Fechar cidades" : "▼ Selecionar cidades"}
            </button>
          </div>
        </div>

        {/* QUICK BUTTONS */}
        <div className="vm-quickbar">
          <button className="vm-btn vm-btn-soft" onClick={aplicarHoje}>Hoje</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar7Dias}>7 dias</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar30Dias}>30 dias</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesAtual}>Mês atual</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesPassado}>Mês passado</button>
          <button className="vm-btn vm-btn-ghost" onClick={limparDatas}>Limpar datas</button>
          <button className="vm-btn vm-btn-ghost" onClick={limparBusca}>Limpar busca</button>
          <button className="vm-btn vm-btn-ghost" onClick={limparCidades}>Limpar cidades</button>
        </div>

        {/* PAINEL CIDADES */}
        {mostrarCidades && (
          <div className="vm-cities-panel">
            <div className="vm-cities-list">
              {opcoesCidades.map(opt => (
                <label key={opt.value} className="vm-check">
                  <input
                    type="checkbox"
                    checked={
                      cidadesFiltro.includes(opt.value) ||
                      (opt.value === "TODAS" && cidadesFiltro.includes("TODAS"))
                    }
                    onChange={() => toggleCidade(opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            {/* CHIPS */}
            <div className="vm-chips">
              {cidadesFiltro.length === 0 && (
                <span className="vm-chip vm-chip-muted">Nenhuma cidade selecionada (mostrando todas)</span>
              )}

              {cidadesFiltro.map(c => (
                <button
                  type="button"
                  key={c}
                  className="vm-chip"
                  onClick={() => removerChip(c)}
                  title="Remover"
                >
                  {c} ✕
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RESUMO */}
      <div className="vm-stats">
        <div className="vm-stat">
          <div className="vm-stat-label">EMENEZES</div>
          <div className="vm-stat-value">{formatarValor(totalEmpresa.emenezes)}</div>
        </div>

        <div className="vm-stat">
          <div className="vm-stat-label">MOTONOW</div>
          <div className="vm-stat-value">{formatarValor(totalEmpresa.motonow)}</div>
        </div>

        <div className="vm-stat">
          <div className="vm-stat-label">Total motos</div>
          <div className="vm-stat-value">{totalGeralMotos}</div>
        </div>

        <div className="vm-stat">
          <div className="vm-stat-label">A repassar EMENEZES</div>
          <div className="vm-stat-value">{formatarValor(totalARepassarPorEmpresa.emenezes)}</div>
        </div>

        <div className="vm-stat">
          <div className="vm-stat-label">A repassar MOTOCENTER</div>
          <div className="vm-stat-value">{formatarValor(totalARepassarPorEmpresa.motonow)}</div>
        </div>

        <div className="vm-stat vm-stat-highlight">
          <div className="vm-stat-label">Líquido EMENEZES</div>
          <div className="vm-stat-value">{formatarValor(totalLiquidoPorEmpresa.emenezes)}</div>
        </div>

        <div className="vm-stat vm-stat-highlight">
          <div className="vm-stat-label">Líquido MOTONOW</div>
          <div className="vm-stat-value">{formatarValor(totalLiquidoPorEmpresa.motonow)}</div>
        </div>
      </div>

      {/* TABELA */}
      <div className="table-container vm-table-card">
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
              <th>Compra</th>
              <th>Repasse</th>
              <th>Pagamento</th>
              <th>Gasolina</th>
              <th>Filial</th>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Brinde</th>
              <th>Data</th>
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
                <td>{v.numero_cliente}</td>
                <td>{v.como_chegou}</td>
                <td>{formatarValor(v.valor)}</td>
                <td>{formatarValor(v.valor_compra)}</td>
                <td>{formatarValor(v.repasse)}</td>
                <td>{v.forma_pagamento}</td>
                <td>{v.gasolina ? formatarValor(v.gasolina) : "-"}</td>
                <td>{v.filial_venda || "-"}</td>
                <td>{getEmpresa(v)}</td>
                <td>{getCNPJ(v)}</td>
                <td>{v.brinde ? "SIM" : "NÃO"}</td>
                <td>{new Date(v.created_at).toLocaleDateString("pt-BR")}</td>
                <td>{getValorARepassar(v) == null ? "-" : formatarValor(getValorARepassar(v))}</td>
                <td>{formatarValor(calcLiquido(v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}