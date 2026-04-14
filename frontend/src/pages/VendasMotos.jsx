import { useEffect, useMemo, useState } from "react";
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
      currency: "BRL",
    });
  }

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [
      headers.join(";"),
      ...dados.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
  }

  function getValorARepassar(v) {
    const repasse = Number(v.repasse || 0);
    if (!repasse || Number.isNaN(repasse) || repasse <= 0) return 0;

    const valorVenda = Number(v.valor || 0);
    return valorVenda - repasse;
  }

  function calcLiquido(v) {
    const valorVenda = Number(v.valor || 0);
    const valorCompra = Number(v.valor_compra || 0);
    const gasolina = Number(v.gasolina || 0);
    const comissao = Number(v.comissao_valor || 0);
    const valorBrinde = v.brinde ? 100 : 0;
    const aRepassar = getValorARepassar(v) || 0;

    return valorVenda - valorCompra - valorBrinde - gasolina - comissao - aRepassar;
  }

  /* ================= FILTROS ================= */
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadesFiltro, setCidadesFiltro] = useState([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [buscaChassi, setBuscaChassi] = useState("");
  const [mostrarCidades, setMostrarCidades] = useState(false);

  /* ================= EDITAR VENDA ================= */
  const [modalEditar, setModalEditar] = useState(null);
  const [editarValor, setEditarValor] = useState("");
  const [editarRp, setEditarRp] = useState(false);
  const [editarPagamento, setEditarPagamento] = useState("");
  const [editarGasolina, setEditarGasolina] = useState("");
  const [editarBrinde, setEditarBrinde] = useState(false);
  const [editarLocalRetirada, setEditarLocalRetirada] = useState("");
  const [editarFilialRetirada, setEditarFilialRetirada] = useState("");
  const [editarComissao, setEditarComissao] = useState("");
const [editarRr, setEditarRr] = useState(false);

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
    "CHA GRANDE",
  ];

  const opcoesCidades = [
    { value: "TODAS", label: "Todas cidades" },
    ...cidadesPadrao.map((c) => ({ value: c, label: c })),
    { value: "OUTRAS", label: "Outras cidades" },
    { value: "SEM_CIDADE", label: "Sem cidade" },
  ];

  /* ================= LOAD ================= */
  useEffect(() => {
    api
      .get("/vendas-motos")
      .then((res) => setVendas(res.data || []))
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

  /* ================= EDIÇÃO ================= */
  function abrirEditarVenda(v) {
    setModalEditar(v);
    setEditarValor(v.valor ?? "");
    setEditarRp(!!v.rp);
    setEditarPagamento(v.forma_pagamento || "");
    setEditarGasolina(v.gasolina ?? "");
    setEditarBrinde(!!v.brinde);
    setEditarLocalRetirada(v.local_retirada || "");
    setEditarFilialRetirada(v.filial_retirada || "");
    setEditarComissao(v.comissao_valor ?? "");
setEditarRr(!!v.rr);
  }

  async function salvarEdicaoVenda() {
    if (!modalEditar) return;

    try {
      const res = await api.put(`/vendas-motos/${modalEditar.id}`, {
        valor: editarValor,
        rp: editarRp ? true : false,
        forma_pagamento: editarPagamento,
        gasolina: editarGasolina,
        brinde: editarBrinde,
        local_retirada: editarLocalRetirada,
        filial_retirada: editarLocalRetirada === "FILIAL" ? editarFilialRetirada : null,
        comissao_valor: editarComissao,
rr: editarRr ? true : false,
      });

      const vendaAtualizada = res.data.venda;

      setVendas((prev) =>
        prev.map((v) => (v.id === modalEditar.id ? { ...v, ...vendaAtualizada, rp: editarRp, } : v))
      );

      setModalEditar(null);
      alert("Venda atualizada com sucesso");
    } catch (err) {
      const msg = err?.response?.data?.message || "Erro ao editar venda";
      alert(msg);
      console.error("Erro salvarEdicaoVenda:", err);
    }
  }

  /* ================= BOTÕES RÁPIDOS ================= */
  function aplicarOntem() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = ontem.toISOString().slice(0, 10);
    setDataInicio(data);
    setDataFim(data);
  }

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

  function toggleCidade(valor) {
    if (valor === "TODAS") {
      if (cidadesFiltro.includes("TODAS")) setCidadesFiltro([]);
      else setCidadesFiltro(["TODAS"]);
      return;
    }

    const base = cidadesFiltro.filter((x) => x !== "TODAS");

    if (base.includes(valor)) {
      setCidadesFiltro(base.filter((x) => x !== valor));
    } else {
      setCidadesFiltro([...base, valor]);
    }
  }

  function removerChip(valor) {
    setCidadesFiltro((prev) => prev.filter((x) => x !== valor));
  }

  /* ================= FILTRAGEM ================= */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const empresa = getEmpresa(v);
      const dataVenda = new Date(v.data_venda || v.created_at);

      const okEmpresa = empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade = (() => {
        if (cidadesFiltro.length === 0 || cidadesFiltro.includes("TODAS")) return true;

        const filial = (v.filial_venda || "").trim();

        if (cidadesFiltro.includes("SEM_CIDADE") && filial === "") return true;

        if (cidadesFiltro.includes("OUTRAS")) {
          if (filial !== "" && !cidadesPadrao.includes(filial)) return true;
        }

        const cidadesEspecificas = cidadesFiltro.filter(
          (x) => x !== "SEM_CIDADE" && x !== "OUTRAS" && x !== "TODAS"
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

    vendasFiltradas.forEach((v) => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor || 0);
      else motonow += Number(v.valor || 0);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  const totalGeralMotos = vendasFiltradas.length;

  const totalARepassarPorEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach((v) => {
      const valorARepassar = getValorARepassar(v);

      if (getEmpresa(v) === "EMENEZES") emenezes += valorARepassar;
      else motonow += valorARepassar;
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  const totalLiquidoPorEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach((v) => {
      const liq = calcLiquido(v);
      if (getEmpresa(v) === "EMENEZES") emenezes += liq;
      else motonow += liq;
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  /* ================= COLUNAS ================= */
  const STORAGE_KEY_COLS = "vm_cols_v1";

  const COLUNAS = useMemo(
    () => [
      { key: "modelo", label: "Modelo" },
      { key: "cor", label: "Cor" },
      { key: "chassi", label: "Chassi" },
      { key: "cliente", label: "Cliente" },
      { key: "telefone", label: "Telefone" },
      { key: "origem", label: "Como chegou" },
      { key: "valor", label: "Valor" },
      { key: "compra", label: "Compra" },
      { key: "repasse", label: "Repasse" },
      { key: "pagamento", label: "Pagamento" },
      { key: "gasolina", label: "Gasolina" },
      { key: "filial", label: "Filial venda" },
      { key: "filial_origem", label: "Filial origem" },
      { key: "empresa", label: "Empresa" },
      { key: "cnpj", label: "CNPJ" },
      { key: "brinde", label: "Brinde" },
      { key: "rp", label: "RP" },
      { key: "data", label: "Data" },
      { key: "a_repassar", label: "A repassar" },
      { key: "liquido", label: "Líquido" },
      { key: "local_retirada", label: "Local retirada" },
      { key: "filial_retirada", label: "Filial retirada" },
      { key: "comissao", label: "Comissão" },
      { key: "acoes", label: "Ações" },
    ],
    []
  );

  const defaultCols = useMemo(
    () => [
      "modelo",
      "chassi",
      "cliente",
      "valor",
      "comissao",
      "rp",
      "compra",
      "repasse",
      "a_repassar",
      "liquido",
      "filial",
      "empresa",
      "data",
      "acoes",
    ],
    []
  );

  const [mostrarColunas, setMostrarColunas] = useState(false);

  const [colunasAtivas, setColunasAtivas] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {
      //
    }
    return defaultCols;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_COLS, JSON.stringify(colunasAtivas));
    } catch (_) {
      //
    }
  }, [colunasAtivas]);

  function toggleColuna(key) {
    setColunasAtivas((prev) => {
      if (prev.includes(key)) {
        const novo = prev.filter((k) => k !== key);
        return novo.length === 0 ? prev : novo;
      }
      return [...prev, key];
    });
  }

  function marcarTodasColunas() {
    setColunasAtivas(COLUNAS.map((c) => c.key));
  }

  function marcarBasico() {
    setColunasAtivas(["modelo", "chassi", "cliente", "filial", "data"]);
  }

  function marcarFinanceiro() {
    setColunasAtivas([
      "modelo",
      "valor",
      "compra",
      "repasse",
      "comissao",
      "rp",
      "a_repassar",
      "liquido",
      "empresa",
      "data",
      "acoes",
    ]);
  }

  function limparColunas() {
    setColunasAtivas(defaultCols);
  }

  function getCellValue(v, key) {
    switch (key) {
      case "modelo":
        return v.modelo;
      case "cor":
        return v.cor;
      case "chassi":
        return v.chassi;
      case "cliente":
        return v.nome_cliente;
      case "telefone":
        return v.numero_cliente;
      case "origem":
        return v.como_chegou;
      case "valor":
        return formatarValor(v.valor);
      case "compra":
        return formatarValor(v.valor_compra);
      case "repasse":
        return formatarValor(v.repasse);
      case "pagamento":
        return v.forma_pagamento || "-";
      case "gasolina":
        return v.gasolina ? formatarValor(v.gasolina) : "-";
      case "filial":
        return v.filial_venda || "-";
      case "filial_origem":
        return v.filial_origem || "-";
      case "empresa":
        return getEmpresa(v);
      case "cnpj":
        return getCNPJ(v);
      case "brinde":
        return v.brinde ? "SIM" : "NÃO";
      case "rp":
        return v.rp === true ? "SIM" : "NÃO";
      case "data":
        return new Date(v.data_venda || v.created_at).toLocaleDateString("pt-BR");
      case "a_repassar":
        return formatarValor(getValorARepassar(v));
      case "liquido":
        return formatarValor(calcLiquido(v));
      case "comissao":
        return formatarValor(v.comissao_valor);
      case "local_retirada":
        return v.local_retirada || "-";
      case "filial_retirada":
        return v.filial_retirada || "-";
      case "acoes":
        return (
          <button className="vm-btn vm-btn-soft" onClick={() => abrirEditarVenda(v)}>
            Editar
          </button>
        );
      default:
        return "";
    }
  }

  function getCsvValue(v, key) {
    switch (key) {
      case "modelo":
        return v.modelo;
      case "cor":
        return v.cor;
      case "chassi":
        return v.chassi;
      case "cliente":
        return v.nome_cliente;
      case "telefone":
        return v.numero_cliente;
      case "origem":
        return v.como_chegou;
      case "valor":
        return v.valor != null ? Number(v.valor).toFixed(2) : "";
      case "compra":
        return v.valor_compra != null ? Number(v.valor_compra).toFixed(2) : "";
      case "repasse":
        return v.repasse != null ? Number(v.repasse).toFixed(2) : "";
      case "pagamento":
        return v.forma_pagamento || "";
      case "gasolina":
        return v.gasolina != null ? Number(v.gasolina).toFixed(2) : "";
      case "filial":
        return v.filial_venda || "";
      case "filial_origem":
        return v.filial_origem || "";
      case "empresa":
        return getEmpresa(v);
      case "cnpj":
        return getCNPJ(v);
      case "brinde":
        return v.brinde ? "SIM" : "NÃO";
      case "rp":
        return v.rp ? "SIM" : "NÃO";
      case "data":
        return new Date(v.data_venda || v.created_at).toLocaleDateString("pt-BR");
      case "a_repassar":
        return Number(getValorARepassar(v)).toFixed(2);
      case "liquido":
        return Number(calcLiquido(v)).toFixed(2);
      case "comissao":
        return v.comissao_valor != null ? Number(v.comissao_valor).toFixed(2) : "";
      case "local_retirada":
        return v.local_retirada || "";
      case "filial_retirada":
        return v.filial_retirada || "";
      case "acoes":
        return "";
      default:
        return "";
    }
  }

  const colunasOrdenadas = useMemo(() => {
    const order = COLUNAS.map((c) => c.key);
    return [...colunasAtivas].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [colunasAtivas, COLUNAS]);

  /* ================= UI ================= */
  return (
    <div className="vendas-motos-container">
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
            className="vm-btn vm-btn-ghost"
            onClick={() => setMostrarColunas((v) => !v)}
            title="Escolher colunas"
          >
            🧩 Colunas
          </button>

          <button
            className="vm-btn vm-btn-primary"
            onClick={() => {
              const headers = colunasOrdenadas;
              exportarCSV(
                "historico_vendas_motos.csv",
                headers,
                vendasFiltradas.map((v) => {
                  const row = {};
                  headers.forEach((h) => {
                    row[h] = getCsvValue(v, h);
                  });
                  return row;
                })
              );
            }}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {mostrarColunas && (
        <div className="vm-card" style={{ marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div>
              <strong>Escolha as colunas</strong>
              <div style={{ opacity: 0.75, fontSize: 12 }}>
                Dica: suas escolhas ficam salvas neste navegador.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="vm-btn vm-btn-soft" onClick={marcarTodasColunas}>
                Todas
              </button>
              <button className="vm-btn vm-btn-soft" onClick={marcarBasico}>
                Básico
              </button>
              <button className="vm-btn vm-btn-soft" onClick={marcarFinanceiro}>
                Financeiro
              </button>
              <button className="vm-btn vm-btn-ghost" onClick={limparColunas}>
                Reset
              </button>
              <button className="vm-btn vm-btn-ghost" onClick={() => setMostrarColunas(false)}>
                Fechar
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {COLUNAS.map((c) => (
              <label
                key={c.key}
                className="vm-check"
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={colunasAtivas.includes(c.key)}
                  onChange={() => toggleColuna(c.key)}
                />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="vm-card">
        <div className="vm-filters-grid">
          <div className="vm-field">
            <label>Empresa</label>
            <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
              <option value="TODAS">Todas</option>
              <option value="EMENEZES">Emenezes</option>
              <option value="MOTONOW">MotoNow</option>
            </select>
          </div>

          <div className="vm-field">
            <label>Data início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>

          <div className="vm-field">
            <label>Data fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>

          <div className="vm-field vm-field-wide">
            <label>Busca</label>
            <input
              placeholder="Buscar por chassi, modelo ou cliente..."
              value={buscaChassi}
              onChange={(e) => setBuscaChassi(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>Cidades</label>
            <button
              type="button"
              className="vm-btn vm-btn-ghost vm-btn-full"
              onClick={() => setMostrarCidades((v) => !v)}
            >
              {mostrarCidades ? "▲ Fechar cidades" : "▼ Selecionar cidades"}
            </button>
          </div>
        </div>

        <div className="vm-quickbar">
          <button className="vm-btn vm-btn-soft" onClick={aplicarHoje}>
            Hoje
          </button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarOntem}>
            Ontem
          </button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar7Dias}>
            7 dias
          </button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar30Dias}>
            30 dias
          </button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesAtual}>
            Mês atual
          </button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesPassado}>
            Mês passado
          </button>
          <button className="vm-btn vm-btn-ghost" onClick={limparDatas}>
            Limpar datas
          </button>
          <button className="vm-btn vm-btn-ghost" onClick={limparBusca}>
            Limpar busca
          </button>
          <button className="vm-btn vm-btn-ghost" onClick={limparCidades}>
            Limpar cidades
          </button>
        </div>

        {mostrarCidades && (
          <div className="vm-cities-panel">
            <div className="vm-cities-list">
              {opcoesCidades.map((opt) => (
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

            <div className="vm-chips">
              {cidadesFiltro.length === 0 && (
                <span className="vm-chip vm-chip-muted">
                  Nenhuma cidade selecionada (mostrando todas)
                </span>
              )}

              {cidadesFiltro.map((c) => (
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
          <div className="vm-stat-label">A repassar MOTONOW</div>
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

      <div className="table-container vm-table-card">
        <table className="table">
          <thead>
            <tr>
              {colunasOrdenadas.map((key) => {
                const col = COLUNAS.find((c) => c.key === key);
                return <th key={key}>{col?.label || key}</th>;
              })}
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map((v) => (
              <tr key={v.id}>
                {colunasOrdenadas.map((key) => (
                  <td key={key}>{getCellValue(v, key)}</td>
                ))}
              </tr>
            ))}

            {vendasFiltradas.length === 0 && (
              <tr>
                <td
                  colSpan={colunasOrdenadas.length}
                  style={{ textAlign: "center", opacity: 0.7, padding: 14 }}
                >
                  Nenhuma venda encontrada com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalEditar && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Editar venda da moto</h3>

            <input
              type="number"
              placeholder="Valor da venda"
              value={editarValor}
              onChange={(e) => setEditarValor(e.target.value)}
            />

            <input
              placeholder="Forma de pagamento"
              value={editarPagamento}
              onChange={(e) => setEditarPagamento(e.target.value)}
            />

            <input
              type="number"
              placeholder="Gasolina"
              value={editarGasolina}
              onChange={(e) => setEditarGasolina(e.target.value)}
            />

            <input
              type="number"
              placeholder="Comissão"
              value={editarComissao}
              onChange={(e) => setEditarComissao(e.target.value)}
            />

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={editarBrinde}
                onChange={(e) => setEditarBrinde(e.target.checked)}
              />
              Brinde
            </label>

            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <input
                type="checkbox"
                checked={editarRp}
                onChange={(e) => setEditarRp(e.target.checked)}
              />
              RP
            </label>

<label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
  <input
    type="checkbox"
    checked={editarRr}
    onChange={(e) => setEditarRr(e.target.checked)}
  />
  RR
</label>
            <select
              value={editarLocalRetirada}
              onChange={(e) => setEditarLocalRetirada(e.target.value)}
              style={{ marginTop: 10 }}
            >
              <option value="">Local de retirada</option>
              <option value="FILIAL">Retirada em filial</option>
              <option value="ENTREGA">Entrega</option>
            </select>

            {editarLocalRetirada === "FILIAL" && (
              <select
                value={editarFilialRetirada}
                onChange={(e) => setEditarFilialRetirada(e.target.value)}
                style={{ marginTop: 10 }}
              >
                <option value="">Filial de retirada</option>
                <option value="ESCADA">ESCADA</option>
                <option value="IPOJUCA">IPOJUCA</option>
                <option value="RIBEIRAO">RIBEIRÃO</option>
                <option value="SAO JOSE">SÃO JOSÉ</option>
                <option value="CATENDE">CATENDE</option>
                <option value="XEXEU">XEXEU</option>
                <option value="MARAGOGI">MARAGOGI</option>
                <option value="IPOJUCA RICARDO">IPOJUCA RICARDO</option>
                <option value="CHA GRANDE">CHA GRANDE</option>
              </select>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
              <button className="vm-btn vm-btn-primary" onClick={salvarEdicaoVenda}>
                Salvar
              </button>

              <button className="vm-btn vm-btn-ghost" onClick={() => setModalEditar(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
