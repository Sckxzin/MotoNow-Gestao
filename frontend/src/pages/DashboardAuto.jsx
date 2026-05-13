
/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DashboardAuto.css";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

/* ================= HELPERS ================= */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(v) {
  if (v == null || Number.isNaN(Number(v))) return "-";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function safeDate(d) {
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? null : x;
}

function isoDateOnly(d) {
  const x = safeDate(d);
  if (!x) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBRFromISO(iso) {
  const x = safeDate(iso);
  if (!x) return "";
  return x.toLocaleDateString("pt-BR");
}

function parseISODateOnly(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function clampDateRange(dateValue, dataInicio, dataFim) {
  const dt = safeDate(dateValue);
  if (!dt) return false;

  if (dataInicio) {
    const di = parseISODateOnly(dataInicio);
    if (di && dt < di) return false;
  }

  if (dataFim) {
    const df = new Date(`${dataFim}T23:59:59`);
    if (!Number.isNaN(df.getTime()) && dt > df) return false;
  }

  return true;
}

function getEmpresa(v) {
  return v.santander === true || v.santander === "SIM" ? "EMENEZES" : "MOTONOW";
}

function pickLoja(v) {
  return String(v.filial_venda || v.filial_origem || v.filial || "N/I")
    .trim()
    .toUpperCase();
}

function pickCidade(v) {
  return String(v.filial_venda || v.filial_origem || v.filial || "N/I")
    .trim()
    .toUpperCase();
}

/* ================= CÁLCULOS ================= */
function getValorARepassar(v) {
  const repasse = Number(v.repasse || 0);
  if (!repasse || Number.isNaN(repasse) || repasse <= 0) return 0;

  const valorVenda = Number(v.valor || 0);
  return valorVenda - repasse;
}

function calcLiquidoMoto(v) {
  const valorVenda = Number(v.valor || 0);
  const valorCompra = Number(v.valor_compra || 0);
  const gasolina = Number(v.gasolina || 0);
  const comissao = Number(v.comissao_valor || 0);
  const brinde = v.brinde ? 100 : 0;
  const aRepassar = getValorARepassar(v) || 0;

  return valorVenda - valorCompra - brinde - gasolina - comissao - aRepassar;
}

/* ================= THEME ================= */
const THEME = {
  bg:
    "radial-gradient(1100px 700px at 18% 8%, rgba(97,140,255,0.12), transparent 60%), radial-gradient(900px 600px at 92% 20%, rgba(0,255,200,0.10), transparent 55%), #07090c",
  card: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.68)",
  shadow: "0 18px 50px rgba(0,0,0,0.45)",
  grid: { stroke: "rgba(255,255,255,0.02)", vertical: false },
  axis: {
    tick: { fill: "rgba(255,255,255,0.60)", fontSize: 11 },
    axisLine: { stroke: "rgba(255,255,255,0.08)" },
    tickLine: { stroke: "rgba(255,255,255,0.05)" },
  },
};

function tooltipProps(formatter) {
  return {
    contentStyle: {
      background: "rgba(10,12,14,0.96)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 14,
      color: "rgba(255,255,255,0.92)",
      boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
      padding: 12,
    },
    labelStyle: { color: "rgba(255,255,255,0.72)" },
    itemStyle: { color: "rgba(255,255,255,0.92)" },
    formatter,
  };
}

/* ================= COMPONENTE ================= */
export default function DashboardAuto() {
  const nav = useNavigate();

  const [vendasMotos, setVendasMotos] = useState([]);
  const [motos, setMotos] = useState([]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
const [financeiro, setFinanceiro] = useState([]);
  

  const slides = useMemo(
    () => [
      { id: "kpis", title: "Resumo executivo" },
      { id: "fat_dia", title: "Faturamento por dia" },
      { id: "ultimos_7", title: "Vendas nos últimos 7 dias" },
{ id: "acumulado_7", title: "Acumulado 7 dias" },
      { id: "estoque_motos", title: "Estoque atual de motos" },
      { id: "historico_estoque", title: "Fechamento de estoque" },
      { id: "fechamento_loja", title: "Fechamento por loja" },
      { id: "top_modelos", title: "Top modelos e cidades" },
{ id: "financeiro", title: "Financeiro" },
      { id: "resumo_final", title: "Resumo final" },
    ],
    []
  );

  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const timerRef = useRef(null);
  const intervalMs = 8000;

  useEffect(() => {
    api
      .get("/vendas-motos")
      .then((res) => setVendasMotos(res.data || []))
      .catch(() => setVendasMotos([]));

    api
      .get("/motos")
      .then((res) => setMotos(res.data || []))
      .catch(() => setMotos([]));
  }, []);



useEffect(() => {
  api
    .get("/financeiro-dashboard", {
      params: { dataInicio, dataFim },
    })
    .then((res) => setFinanceiro(res.data || []))
    .catch(() => setFinanceiro([]));
}, [dataInicio, dataFim]);

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

  function nextSlide() {
    setSlide((s) => (s + 1) % slides.length);
  }

  function prevSlide() {
    setSlide((s) => (s - 1 + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!autoPlay) return;
    timerRef.current = setInterval(() => nextSlide(), intervalMs);
    return () => timerRef.current && clearInterval(timerRef.current);
  }, [autoPlay, slides.length]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key.toLowerCase() === " ") setAutoPlay((a) => !a);
      if (e.key.toLowerCase() === "f") {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

const financeiroGrafico = useMemo(() => {
  return (financeiro || []).map((item) => ({
    data: formatDateBRFromISO(item.data),
    dataISO: item.data,
    saldo: toNumber(item.saldo),
    aReceber: toNumber(item.a_receber),
    estoqueCompra: toNumber(item.estoque_compra),
    estoqueVenda: toNumber(item.estoque_venda),
    jotaCompra: toNumber(item.jota_compra),
    jotaVenda: toNumber(item.jota_venda),
  }));
}, [financeiro]);

  /* ================= BASE FILTRADA ================= */
  const motosFiltradas = useMemo(() => {
    return (vendasMotos || [])
      .filter((v) => clampDateRange(v.data_venda || v.created_at, dataInicio, dataFim))
      .filter((v) => empresaFiltro === "TODAS" || getEmpresa(v) === empresaFiltro);
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const motosBase7Dias = useMemo(() => {
    return (vendasMotos || []).filter(
      (v) => empresaFiltro === "TODAS" || getEmpresa(v) === empresaFiltro);
  }, [vendasMotos, empresaFiltro]);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;
    const comissoes = motosFiltradas.reduce((acc, v) => acc + toNumber(v.comissao_valor), 0);

    const hoje = new Date();
    const di = new Date();
    di.setDate(hoje.getDate() - 6);
    di.setHours(0, 0, 0, 0);

    const motos7d = (vendasMotos || []).filter((v) => {
      const dt = safeDate(v.data_venda || v.created_at);
      return dt && dt >= di && dt <= hoje;
    }).length;

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      comissoes,
      motos7d,
    };
  }, [motosFiltradas, vendasMotos]);

  /* ================= FATURAMENTO POR DIA ================= */
  const faturamentoPorDia = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const key = isoDateOnly(v.data_venda || v.created_at);
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          diaISO: key,
          dia: formatDateBRFromISO(key),
          faturamento: 0,
          motos: 0,
          comissoes: 0,
        });
      }

      const cur = map.get(key);
      cur.faturamento += toNumber(v.valor);
      cur.motos += 1;
      cur.comissoes += toNumber(v.comissao_valor);
      map.set(key, cur);
    });

    return Array.from(map.values())
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .slice(-45);
  }, [motosFiltradas]);

  /* ================= ÚLTIMOS 7 DIAS ================= */
  const vendasUltimos7Dias = useMemo(() => {
  const hoje = new Date();
  const arr = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(hoje.getDate() - i);

    const iso = d.toISOString().slice(0, 10);

    const vendasDoDia = motosBase7Dias.filter(
      (v) => isoDateOnly(v.data_venda || v.created_at) === iso
    );

    arr.push({
      dia: d.toLocaleDateString("pt-BR"),
      motos: vendasDoDia.length,
      faturamento: vendasDoDia.reduce((acc, v) => acc + toNumber(v.valor), 0),
    });
  }

  return arr;
}, [motosBase7Dias]);

const acumulado7Dias = useMemo(() => {
  const base = motosBase7Dias;

  const map = new Map();

  base.forEach((v) => {
    const d = isoDateOnly(v.data_venda || v.created_at);
    if (!d) return;

    map.set(d, (map.get(d) || 0) + 1);
  });

  const datas = Array.from(map.keys()).sort();

  const resultado = [];

  datas.forEach((data, index) => {
    let soma = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(data);
      d.setDate(d.getDate() - i);

      const key = d.toISOString().slice(0, 10);
      soma += map.get(key) || 0;
    }

    resultado.push({
      dia: formatDateBRFromISO(data),
      total: soma,
    });
  });

  return resultado;
}, [motosBase7Dias]);

  /* ================= ESTOQUE ATUAL REAL ================= */
  const estoqueAtualPorLoja = useMemo(() => {
    const map = new Map();

    (motos || [])
      .filter((m) => m.status !== "VENDIDA")
      .filter((m) => empresaFiltro === "TODAS" || getEmpresa(m) === empresaFiltro)
      .forEach((m) => {
        const loja = String(m.filial || "N/I").trim().toUpperCase();

        if (!map.has(loja)) {
          map.set(loja, {
            loja,
            disponiveis: 0,
            negociacao: 0,
            pendente: 0,
            total: 0,
          });
        }


        const cur = map.get(loja);
        cur.total += 1;

        if (m.status === "DISPONIVEL") cur.disponiveis += 1;
        else if (m.status === "NEGOCIACAO") cur.negociacao += 1;
        else if (m.status === "PENDENTE_APROVACAO") cur.pendente += 1;

        map.set(loja, cur);
      });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [motos, empresaFiltro]);

  const estoqueGeral = useMemo(() => {
  return estoqueAtualPorLoja.reduce(
    (acc, loja) => {
      acc.disponiveis += loja.disponiveis;
      acc.negociacao += loja.negociacao;
      acc.pendente += loja.pendente;
      acc.total += loja.total;
      return acc;
    },
    { disponiveis: 0, negociacao: 0, pendente: 0, total: 0 }
  );
}, [estoqueAtualPorLoja]);

  /* ================= FECHAMENTO POR LOJA ================= */
  const fechamentoPorLoja = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const loja = pickLoja(v);

      if (!map.has(loja)) {
        map.set(loja, {
          loja,
          faturamento: 0,
          liquido: 0,
          motos: 0,
          comissoes: 0,
        });
      }

      const cur = map.get(loja);
      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquidoMoto(v);
      cur.motos += 1;
      cur.comissoes += toNumber(v.comissao_valor);
      map.set(loja, cur);
    });

    return Array.from(map.values())
      .map((x) => ({
        ...x,
        faturamento: Math.round(x.faturamento * 100) / 100,
        liquido: Math.round(x.liquido * 100) / 100,
        comissoes: Math.round(x.comissoes * 100) / 100,
      }))
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [motosFiltradas]);

  const fechamentoGeral = useMemo(() => {
    const faturamento = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.faturamento || 0), 0);
    const liquido = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.liquido || 0), 0);
    const motosVendidas = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.motos || 0), 0);
    const comissoes = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.comissoes || 0), 0);
    const ticketMedio = motosVendidas > 0 ? faturamento / motosVendidas : 0;
    const lojasAtivas = fechamentoPorLoja.length;

    return {
      faturamento,
      liquido,
      motosVendidas,
      comissoes,
      ticketMedio,
      lojasAtivas,
    };
  }, [fechamentoPorLoja]);

  /* ================= TOP MODELOS ================= */
  const topModelos = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const key = String(v.modelo || "SEM MODELO").toUpperCase().trim();
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([modelo, total]) => ({ modelo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);


const estoqueHistoricoGrafico = useMemo(() => {
  return (financeiro || []).map((item) => ({
    data: formatDateBRFromISO(item.data),
    quantidade: toNumber(item.quantidade),
    totalCompra: toNumber(item.estoque_compra),
    totalVenda: toNumber(item.estoque_venda),
  }));
}, [financeiro]);

  /* ================= VENDAS POR CIDADE ================= */
  const vendasPorCidade = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const cidade = pickCidade(v);
      map.set(cidade, (map.get(cidade) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);

  /* ================= RESUMO FINAL ================= */
  const resumoFinal = useMemo(() => {
    return {
      faturamentoMotos: motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0),
      liquidoMotos: motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0),
      motosVendidas: motosFiltradas.length,
      comissoes: motosFiltradas.reduce((acc, v) => acc + toNumber(v.comissao_valor), 0),
      estoqueAtual: estoqueAtualPorLoja.reduce((acc, l) => acc + toNumber(l.total), 0),
    };
  }, [motosFiltradas, estoqueAtualPorLoja]);

  /* ================= UI ================= */
  return (
    <div
      className="dash-auto tv-corp"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: THEME.bg,
        color: THEME.text,
      }}
    >
      <div
        style={{
          padding: "18px 22px 10px 22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>MotoNow</div>
            <div style={{ opacity: 0.7, fontWeight: 600 }}>Dashboard • TV</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {slides[slide]?.title} • {empresaFiltro === "TODAS" ? "Todas empresas" : empresaFiltro}{" "}
            {dataInicio || dataFim ? `• ${dataInicio || "…"} → ${dataFim || "…"}` : "• Sem filtro de data"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="tv-btn" onClick={() => nav("/home")}>⬅</button>
          <button className="tv-btn" onClick={prevSlide}>◀</button>
          <button className="tv-btn" onClick={() => setAutoPlay((a) => !a)}>
            {autoPlay ? "⏸" : "▶"}
          </button>
          <button className="tv-btn" onClick={nextSlide}>▶</button>
          <button
            className="tv-btn"
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
            title="Tela cheia"
          >
            ⛶
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "0 22px 12px 22px",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
        }}
      >
        <select className="tv-select" value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <input className="tv-input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <input className="tv-input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="tv-chip" onClick={aplicarHoje}>Hoje</button>
          <button className="tv-chip" onClick={aplicar7Dias}>7d</button>
          <button className="tv-chip" onClick={aplicar30Dias}>30d</button>
          <button className="tv-chip" onClick={aplicarMesAtual}>Mês</button>
          <button className="tv-chip" onClick={limparDatas}>Limpar</button>
        </div>
      </div>

      <div style={{ padding: "0 22px 10px 22px", display: "flex", gap: 8, alignItems: "center" }}>
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setSlide(idx)}
            title={s.title}
            style={{
              width: idx === slide ? 26 : 10,
              height: 10,
              borderRadius: 999,
              border: "none",
              cursor: "pointer",
              background: idx === slide ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.22)",
              transition: "all .18s ease",
            }}
          />
        ))}
        <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.65 }}>
          Dica: <b>Espaço</b> play/pausa • <b>←/→</b> troca • <b>F</b> tela cheia
        </div>
      </div>

      <div style={{ height: "calc(100vh - 150px)", padding: "0 22px 18px 22px" }}>
        {slides[slide]?.id === "kpis" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Comissões" value={formatBRL(kpis.comissoes)} />
            <KpiCard title="Vendas últimos 7 dias" value={kpis.motos7d} />
          </div>
        )}

        {slides[slide]?.id === "fat_dia" && (
          <Panel title="Faturamento de motos por dia" rightHint="(período filtrado)">
            <ResponsiveContainer width="100%" height={470}>
              <BarChart data={faturamentoPorDia} margin={{ top: 18, right: 16, bottom: 44, left: 8 }}>
                <CartesianGrid {...THEME.grid} />
                <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                <YAxis {...THEME.axis} />
                <Tooltip {...tooltipProps((v) => [formatBRL(v), "Faturamento"])} />
                <Bar dataKey="faturamento" radius={[10, 10, 0, 0]} fill="rgba(110,240,200,0.82)" stroke="rgba(255,255,255,0.06)" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "ultimos_7" && (
          <Panel title="Vendas nos últimos 7 dias" rightHint="(quantidade por dia)">
            <ResponsiveContainer width="100%" height={470}>
              <LineChart data={vendasUltimos7Dias} margin={{ top: 18, right: 16, bottom: 30, left: 8 }}>
                <CartesianGrid {...THEME.grid} />
                <XAxis dataKey="dia" {...THEME.axis} />
                <YAxis allowDecimals={false} {...THEME.axis} />
                <Tooltip {...tooltipProps((v, name) => [name === "faturamento" ? formatBRL(v) : v, name])} />
                <Legend />
                <Line type="monotone" dataKey="motos" name="Motos" stroke="rgba(120,160,255,0.95)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        )}

{slides[slide]?.id === "acumulado_7" && (
  <Panel title="Vendas acumuladas nos últimos 7 dias" rightHint="(janela móvel)">
    <ResponsiveContainer width="100%" height={470}>
      <BarChart data={acumulado7Dias} margin={{ top: 18, right: 16, bottom: 40, left: 8 }}>
        <CartesianGrid {...THEME.grid} />
        <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
        <YAxis allowDecimals={false} {...THEME.axis} />
        <Tooltip {...tooltipProps((v) => [v, "Total últimos 7 dias"])} />
        <Bar
          dataKey="total"
          radius={[10, 10, 0, 0]}
          fill="rgba(120,160,255,0.88)"
        />
      </BarChart>
    </ResponsiveContainer>
  </Panel>
)}

        {slides[slide]?.id === "estoque_motos" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <Panel title="Estoque atual de motos por loja" rightHint="(real atual)">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={estoqueAtualPorLoja} margin={{ top: 18, right: 16, bottom: 40, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="loja" angle={-20} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis allowDecimals={false} {...THEME.axis} />
                  <Tooltip {...tooltipProps((v, name) => [v, name])} />
                  <Legend />
                  <Bar dataKey="disponiveis" name="Disponíveis" fill="rgba(110,240,200,0.82)" />
                  <Bar dataKey="negociacao" name="Negociação" fill="rgba(255,190,90,0.88)" />
                  <Bar dataKey="pendente" name="Pendente" fill="rgba(120,160,255,0.88)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Resumo do estoque atual" rightHint="(por loja)">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 470,
                  overflow: "auto",
                  paddingRight: 6,
                }}
              >
<div
  style={{
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 16,
    padding: 14,
  }}
>
  <div style={{ fontSize: 16, fontWeight: 900 }}>GERAL</div>
  <div style={{ marginTop: 6 }}>Total: <strong>{estoqueGeral.total}</strong></div>
  <div>Disponíveis: <strong>{estoqueGeral.disponiveis}</strong></div>
  <div>Negociação: <strong>{estoqueGeral.negociacao}</strong></div>
  <div>Pendente: <strong>{estoqueGeral.pendente}</strong></div>
</div>
                {estoqueAtualPorLoja.map((item) => (
                  <div
                    key={item.loja}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{item.loja}</div>
                    <div style={{ marginTop: 6 }}>Total: <strong>{item.total}</strong></div>
                    <div>Disponíveis: <strong>{item.disponiveis}</strong></div>
                    <div>Negociação: <strong>{item.negociacao}</strong></div>
                    <div>Pendente: <strong>{item.pendente}</strong></div>
                  </div>
                ))}

                {estoqueAtualPorLoja.length === 0 && (
                  <div style={{ opacity: 0.7, fontSize: 14 }}>
                    Nenhum estoque encontrado.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )}

{slides[slide]?.id === "historico_estoque" && (
  <div
    style={{
      height: "100%",
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr",
      gap: 14,
    }}
  >
    <Panel
      title="Fechamento histórico do estoque"
      rightHint="(snapshot diário)"
    >
      <ResponsiveContainer width="100%" height={470}>
        <LineChart
          data={estoqueHistoricoGrafico}
          margin={{ top: 18, right: 16, bottom: 30, left: 8 }}
        >
          <CartesianGrid {...THEME.grid} />

          <XAxis
            dataKey="data"
            {...THEME.axis}
          />

          <YAxis {...THEME.axis} />

          <Tooltip
            {...tooltipProps((v, name) => {
              if (
                name === "totalCompra" ||
                name === "totalVenda"
              ) {
                return [formatBRL(v), name];
              }

              return [v, name];
            })}
          />

          <Legend />

          <Line
            type="monotone"
            dataKey="quantidade"
            name="Qtd motos"
            stroke="rgba(120,160,255,0.95)"
            strokeWidth={3}
          />

          <Line
            type="monotone"
            dataKey="totalCompra"
            name="Compra"
            stroke="rgba(110,240,200,0.92)"
            strokeWidth={2}
          />

          <Line
            type="monotone"
            dataKey="totalVenda"
            name="Venda"
            stroke="rgba(255,190,90,0.95)"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </Panel>

    <Panel
      title="Últimos fechamentos"
      rightHint="(estoque diário)"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 470,
          overflow: "auto",
          paddingRight: 6,
        }}
      >
        {[...(financeiro || [])]
          .sort((a, b) => new Date(b.data) - new Date(a.data))
          .slice(0, 8)
          .map((item) => (
            <div
              key={item.data}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                }}
              >
                {formatDateBRFromISO(item.data)}
              </div>

              <div style={{ marginTop: 8 }}>
                Quantidade:
                <strong> {item.qtd_estoque}</strong>
              </div>

              <div>
                Compra:
                <strong>
                  {" "}
                  {formatBRL(item.estoque_compra)}
                </strong>
              </div>

              <div>
                Venda:
                <strong>
                  {" "}
                  {formatBRL(item.estoque_venda)}
                </strong>
              </div>
            </div>
          ))}

        {financeiro.length === 0 && (
          <div
            style={{
              opacity: 0.7,
              fontSize: 14,
            }}
          >
            Nenhum fechamento encontrado.
          </div>
        )}
      </div>
    </Panel>
  </div>
)}

        {slides[slide]?.id === "fechamento_loja" && (
          <div
            style={{
              height: "100%",
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 0.9fr",
              gap: 14,
            }}
          >
            <Panel title="Fechamento por loja" rightHint="(período filtrado)">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={fechamentoPorLoja} margin={{ top: 18, right: 16, bottom: 40, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="loja" angle={-20} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip
                    {...tooltipProps((v, name) => {
                      if (name === "faturamento" || name === "liquido" || name === "comissoes") {
                        return [formatBRL(v), name];
                      }
                      return [v, name];
                    })}
                  />
                  <Legend />
                  <Bar dataKey="faturamento" name="Faturamento" fill="rgba(120,160,255,0.88)" />
                  <Bar dataKey="liquido" name="Líquido" fill="rgba(110,240,200,0.82)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Resumo por loja" rightHint="(período filtrado)">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  maxHeight: 470,
                  overflow: "auto",
                  paddingRight: 6,
                }}
              >
                {fechamentoPorLoja.map((item) => (
                  <div
                    key={item.loja}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{item.loja}</div>
                    <div style={{ marginTop: 8 }}>Faturamento: <strong>{formatBRL(item.faturamento)}</strong></div>
                    <div>Líquido: <strong>{formatBRL(item.liquido)}</strong></div>
                    <div>Comissões: <strong>{formatBRL(item.comissoes)}</strong></div>
                    <div>Motos: <strong>{item.motos}</strong></div>
                  </div>
                ))}

                {fechamentoPorLoja.length === 0 && (
                  <div style={{ opacity: 0.7, fontSize: 14 }}>
                    Nenhum dado encontrado nesse período.
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Fechamento geral" rightHint="(período filtrado)">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  height: "100%",
                }}
              >
                <BigStat label="Faturamento geral" value={formatBRL(fechamentoGeral.faturamento)} />
                <BigStat label="Líquido geral" value={formatBRL(fechamentoGeral.liquido)} />
                <BigStat label="Motos vendidas" value={fechamentoGeral.motosVendidas} />
                <BigStat label="Comissões" value={formatBRL(fechamentoGeral.comissoes)} />
                <BigStat label="Ticket médio" value={formatBRL(fechamentoGeral.ticketMedio)} />
                <BigStat label="Lojas ativas" value={fechamentoGeral.lojasAtivas} />
              </div>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "top_modelos" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel title="Top 10 modelos vendidos" rightHint="(período filtrado)">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={topModelos} layout="vertical" margin={{ top: 12, right: 18, bottom: 12, left: 22 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis type="number" allowDecimals={false} {...THEME.axis} />
                  <YAxis
                    type="category"
                    dataKey="modelo"
                    width={220}
                    tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.04)" }}
                  />
                  <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                  <Bar dataKey="total" radius={[0, 10, 10, 0]} fill="rgba(160,120,255,0.88)" stroke="rgba(255,255,255,0.06)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Vendas por cidade" rightHint="(período filtrado)">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={vendasPorCidade} layout="vertical" margin={{ top: 12, right: 18, bottom: 12, left: 22 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis type="number" allowDecimals={false} {...THEME.axis} />
                  <YAxis
                    type="category"
                    dataKey="cidade"
                    width={220}
                    tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }}
                    axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.04)" }}
                  />
                  <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                  <Bar dataKey="total" radius={[0, 10, 10, 0]} fill="rgba(110,240,200,0.82)" stroke="rgba(255,255,255,0.06)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}
{slides[slide]?.id === "financeiro" && (
  <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
    <Panel title="Evolução financeira" rightHint="(último valor salvo por dia)">
      <ResponsiveContainer width="100%" height={470}>
        <LineChart data={financeiroGrafico} margin={{ top: 18, right: 16, bottom: 30, left: 8 }}>
          <CartesianGrid {...THEME.grid} />
          <XAxis dataKey="data" {...THEME.axis} />
          <YAxis {...THEME.axis} />
          <Tooltip
            {...tooltipProps((v, name) => [formatBRL(v), name])}
          />
          <Legend />
          <Line type="monotone" dataKey="jotaCompra" name="Jota Compra" stroke="rgba(110,240,200,0.92)" strokeWidth={3} />
          <Line type="monotone" dataKey="jotaVenda" name="Jota Venda" stroke="rgba(120,160,255,0.95)" strokeWidth={3} />
          <Line type="monotone" dataKey="saldo" name="Saldo" stroke="rgba(255,190,90,0.95)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Panel>

    <Panel title="Últimos registros financeiros" rightHint="(último salvo do dia)">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 470,
          overflow: "auto",
          paddingRight: 6,
        }}
      >
        {[...(financeiro || [])]
          .sort((a, b) => new Date(b.data) - new Date(a.data))
          .slice(0, 8)
          .map((item) => (
            <div
              key={item.data}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {formatDateBRFromISO(item.data)}
              </div>
              <div style={{ marginTop: 8 }}>Saldo: <strong>{formatBRL(item.saldo)}</strong></div>
              <div>A receber: <strong>{formatBRL(item.a_receber)}</strong></div>
              <div>Estoque compra: <strong>{formatBRL(item.estoque_compra)}</strong></div>
              <div>Estoque venda: <strong>{formatBRL(item.estoque_venda)}</strong></div>
              <div>Jota compra: <strong>{formatBRL(item.jota_compra)}</strong></div>
              <div>Jota venda: <strong>{formatBRL(item.jota_venda)}</strong></div>
            </div>
          ))}

        {financeiroGrafico.length === 0 && (
          <div style={{ opacity: 0.7, fontSize: 14 }}>
            Nenhum dado financeiro encontrado.
          </div>
        )}
      </div>
    </Panel>
  </div>
)}

        {slides[slide]?.id === "resumo_final" && (
          <div
            style={{
              height: "100%",
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 14,
            }}
          >
            <KpiCard title="Faturamento motos" value={formatBRL(resumoFinal.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(resumoFinal.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={resumoFinal.motosVendidas} />
            <KpiCard title="Comissões" value={formatBRL(resumoFinal.comissoes)} />
            <KpiCard title="Estoque atual" value={resumoFinal.estoqueAtual} />
          </div>
        )}
      </div>

      <style>{`
        .tv-corp .tv-btn{
          height: 36px;
          min-width: 44px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.90);
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .tv-corp .tv-btn:hover{ background: rgba(255,255,255,0.10); }

        .tv-corp .tv-select, .tv-corp .tv-input{
          height: 36px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.90);
          padding: 0 12px;
          outline: none;
        }

        .tv-corp .tv-chip{
          height: 34px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.90);
          cursor: pointer;
        }
        .tv-corp .tv-chip:hover{ background: rgba(255,255,255,0.10); }
      `}</style>
    </div>
  );
}

/* ================= COMPONENTES ================= */
function KpiCard({ title, value, hint }) {
  return (
    <div
      style={{
        background: THEME.card,
        border: THEME.border,
        borderRadius: 18,
        padding: 16,
        boxShadow: THEME.shadow,
        backdropFilter: "blur(8px)",
        minHeight: 98,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: 0.35 }}>{title}</div>
        {hint ? <div style={{ fontSize: 11, opacity: 0.55 }}>{hint}</div> : null}
      </div>
      <div style={{ fontSize: 28, fontWeight: 850, marginTop: 8 }}>{value}</div>
    </div>
  );
}

function BigStat({ label, value }) {
  return (
    <div
      style={{
        background: THEME.card,
        border: THEME.border,
        borderRadius: 18,
        padding: 16,
        boxShadow: THEME.shadow,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.72 }}>{label}</div>
      <div style={{ fontSize: 34, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Panel({ title, rightHint, children }) {
  return (
    <div
      style={{
        height: "100%",
        background: THEME.card,
        border: THEME.border,
        borderRadius: 20,
        padding: 16,
        boxShadow: THEME.shadow,
        backdropFilter: "blur(8px)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 850 }}>{title}</div>
        {rightHint ? <div style={{ fontSize: 12, opacity: 0.65 }}>{rightHint}</div> : null}
      </div>
      <div style={{ marginTop: 10, height: "calc(100% - 34px)" }}>{children}</div>
    </div>
  );
}
