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
} from "recharts";

/* ================= HELPERS ================= */
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function formatBRL(v) {
  if (v == null || Number.isNaN(Number(v))) return "-";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
function clampDateRange(createdAt, dataInicio, dataFim) {
  const dt = safeDate(createdAt);
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

/* ================= LÓGICA LÍQUIDO (SEU JEITO) ================= */
function calcLiquidoMoto(v) {
  const valor = toNumber(v.valor);
  const compra = toNumber(v.valor_compra);
  const repasse = toNumber(v.repasse);
  const gasolina = toNumber(v.gasolina);
  const brindeDesc = v.brinde ? 100 : 0;

  const base = repasse > 0 ? repasse : compra;
  return valor - base - gasolina - brindeDesc;
}

/* ================= THEME (TV CORPORATIVO) ================= */
const THEME = {
  bg: "radial-gradient(1100px 700px at 18% 8%, rgba(97,140,255,0.12), transparent 60%), radial-gradient(900px 600px at 92% 20%, rgba(0,255,200,0.10), transparent 55%), #07090c",
  card: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  border: "1px solid rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.92)",
  subtext: "rgba(255,255,255,0.68)",
  shadow: "0 18px 50px rgba(0,0,0,0.45)",
  grid: { stroke: "rgba(255,255,255,0.02)", vertical: false }, // quase invisível
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

  // Dados
  const [vendasMotos, setVendasMotos] = useState([]);
  const [vendasPecas, setVendasPecas] = useState([]);

  // Filtros
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS"); // TODAS | EMENEZES | MOTONOW

  // Slides
  const slides = useMemo(
    () => [
      { id: "kpis", title: "Resumo executivo" },
      { id: "motos_dia", title: "Vendas de motos por dia" },
      { id: "rolling7", title: "Vendas acumuladas (últimos 7 dias)" },
      { id: "liq_sem_mes", title: "Líquido semanal e mensal" },
      { id: "top_modelos", title: "Top 10 modelos" },
      { id: "cidade", title: "Vendas por cidade" },
    ],
    []
  );

  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const intervalMs = 8000;
  const timerRef = useRef(null);

  useEffect(() => {
    api
      .get("/vendas-motos")
      .then((res) => setVendasMotos(res.data || []))
      .catch(() => setVendasMotos([]));

    api
      .get("/vendas")
      .then((res) => setVendasPecas(res.data || []))
      .catch(() => setVendasPecas([]));
  }, []);

  function getEmpresa(v) {
    return v.santander === true || v.santander === "SIM" ? "EMENEZES" : "MOTONOW";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, intervalMs]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= BASE FILTRADA ================= */
  const motosFiltradas = useMemo(() => {
    return (vendasMotos || [])
      .filter((v) => clampDateRange(v.created_at, dataInicio, dataFim))
      .filter((v) => {
        const emp = getEmpresa(v);
        return empresaFiltro === "TODAS" || emp === empresaFiltro;
      });
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const pecasFiltradas = useMemo(() => {
    return (vendasPecas || []).filter((v) => clampDateRange(v.created_at, dataInicio, dataFim));
  }, [vendasPecas, dataInicio, dataFim]);

  function pickCityFromVendaMoto(v) {
    return (
      v.filial_venda ||
      v.filial_origem ||
      v.cidade ||
      v.filial ||
      "N/I"
    );
  }

  /* ================= KPIs ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;

    const faturamentoPecas = pecasFiltradas.reduce((acc, v) => acc + toNumber(v.total), 0);
    const qtdVendasPecas = pecasFiltradas.length;
    const ticketMedioPecas = qtdVendasPecas ? faturamentoPecas / qtdVendasPecas : 0;

    // janela móvel (últimos 7 dias reais do sistema) — independente do filtro
    const hoje = new Date();
    const di = new Date();
    di.setDate(hoje.getDate() - 6);
    di.setHours(0, 0, 0, 0);
    const motos7d = (vendasMotos || []).filter((v) => {
      const dt = safeDate(v.created_at);
      return dt && dt >= di && dt <= hoje;
    }).length;

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      faturamentoPecas,
      qtdVendasPecas,
      ticketMedioPecas,
      motos7d,
    };
  }, [motosFiltradas, pecasFiltradas, vendasMotos]);

  /* ================= GRÁFICOS ================= */

  // Slide 2 — vendas por dia
  const motosPorDia = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const key = isoDateOnly(v.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([diaISO, total]) => ({ diaISO, dia: formatDateBRFromISO(diaISO), total }))
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .slice(-45);
  }, [motosFiltradas]);

  // Slide 3 — rolling 7 dias (respeita filtro atual)
  const vendas7DiasJanelaMovel = useMemo(() => {
    const base = motosFiltradas;

    const countByDay = new Map();
    base.forEach((v) => {
      const k = isoDateOnly(v.created_at);
      if (!k) return;
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    });

    const days = Array.from(countByDay.keys()).sort();
    if (days.length === 0) return [];

    const start = parseISODateOnly(days[0]);
    const end = parseISODateOnly(days[days.length - 1]);
    if (!start || !end) return [];

    const allDays = [];
    const cur = new Date(start);
    while (cur <= end) {
      allDays.push(isoDateOnly(cur));
      cur.setDate(cur.getDate() + 1);
    }

    const counts = allDays.map((k) => countByDay.get(k) || 0);
    const prefix = [0];
    for (let i = 0; i < counts.length; i++) prefix.push(prefix[i] + counts[i]);

    const out = allDays.map((k, i) => {
      const left = Math.max(0, i - 6);
      const soma7 = prefix[i + 1] - prefix[left];
      return { diaISO: k, dia: formatDateBRFromISO(k), total: soma7 };
    });

    return out.slice(-45);
  }, [motosFiltradas]);

  const rolling7Atual = useMemo(() => {
    if (!vendas7DiasJanelaMovel.length) return 0;
    return vendas7DiasJanelaMovel[vendas7DiasJanelaMovel.length - 1].total || 0;
  }, [vendas7DiasJanelaMovel]);

  // Slide 4 — líquido semanal e mensal (mesma tela)
  const liquidoSemanal = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const dt = safeDate(v.created_at);
      if (!dt) return;

      const d = new Date(dt);
      const day = (d.getDay() + 6) % 7; // 0=segunda
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);

      const key = isoDateOnly(d);
      map.set(key, (map.get(key) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([semanaISO, total]) => ({
        semanaISO,
        semana: formatDateBRFromISO(semanaISO),
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.semanaISO.localeCompare(b.semanaISO))
      .slice(-16);
  }, [motosFiltradas]);

  const liquidoMensal = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const dt = safeDate(v.created_at);
      if (!dt) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([mes, total]) => ({ mes, label: mes, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-18);
  }, [motosFiltradas]);

  // Slide 5 — top modelos
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

  // Slide 6 — vendas por cidade
  const vendasPorCidade = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const city = String(pickCityFromVendaMoto(v) || "N/I").toUpperCase().trim();
      map.set(city, (map.get(city) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 14);
  }, [motosFiltradas]);

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
      {/* TOPBAR */}
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
            <div style={{ opacity: 0.70, fontWeight: 600 }}>Dashboard • TV</div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.70 }}>
            {slides[slide]?.title} •{" "}
            {empresaFiltro === "TODAS" ? "Todas empresas" : empresaFiltro}{" "}
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

      {/* FILTROS */}
      <div style={{ padding: "0 22px 12px 22px", display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
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

      {/* DOTS */}
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

      {/* CONTENT */}
      <div style={{ height: "calc(100vh - 150px)", padding: "0 22px 18px 22px" }}>
        {/* Slide 1: KPIs */}
        {slides[slide]?.id === "kpis" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento Motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido Motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Motos (últimos 7 dias)" value={kpis.motos7d} />

            <KpiCard title="Faturamento Peças" value={formatBRL(kpis.faturamentoPecas)} />
            <KpiCard title="Vendas Peças" value={kpis.qtdVendasPecas} />
            <KpiCard title="Ticket Médio Peças" value={formatBRL(kpis.ticketMedioPecas)} />
            <KpiCard
              title="Rolling 7 (agora)"
              value={rolling7Atual}
              hint="Total acumulado nos últimos 7 dias"
            />
          </div>
        )}

        {/* Slide 2: Vendas por dia */}
        {slides[slide]?.id === "motos_dia" && (
          <Panel title="Vendas de motos por dia" rightHint="(período filtrado)">
            <ResponsiveContainer width="100%" height={470}>
              <BarChart data={motosPorDia} margin={{ top: 18, right: 16, bottom: 44, left: 8 }}>
                <CartesianGrid {...THEME.grid} />
                <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                <YAxis allowDecimals={false} {...THEME.axis} />
                <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="rgba(110,240,200,0.82)" stroke="rgba(255,255,255,0.06)" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {/* Slide 3: Rolling 7 */}
        {slides[slide]?.id === "rolling7" && (
          <Panel title="Vendas acumuladas nos últimos 7 dias" rightHint={dataInicio || dataFim ? "(respeita filtro)" : "(sem filtro)"}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, height: "100%" }}>
              <div style={{ height: "100%" }}>
                <ResponsiveContainer width="100%" height={470}>
                  <BarChart data={vendas7DiasJanelaMovel} margin={{ top: 18, right: 16, bottom: 44, left: 8 }}>
                    <CartesianGrid {...THEME.grid} />
                    <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                    <YAxis allowDecimals={false} {...THEME.axis} />
                    <Tooltip {...tooltipProps((v) => [v, "Total (7 dias)"])} />
                    <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="rgba(120,160,255,0.88)" stroke="rgba(255,255,255,0.06)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
                <BigStat label="Rolling 7 (agora)" value={rolling7Atual} />
                <BigStat label="Motos no período" value={kpis.qtdMotos} />
                <BigStat label="Líquido no período" value={formatBRL(kpis.liquidoMotos)} />
                <div style={{ marginTop: "auto", fontSize: 12, opacity: 0.65 }}>
                  * Rolling 7 = soma dos últimos 7 dias para cada dia do gráfico.
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Slide 4: Liquido semanal e mensal */}
        {slides[slide]?.id === "liq_sem_mes" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel title="Líquido semanal" rightHint="(agregado por semana)">
              <ResponsiveContainer width="100%" height={470}>
                <LineChart data={liquidoSemanal} margin={{ top: 18, right: 16, bottom: 40, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="semana" angle={-20} textAnchor="end" height={55} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [formatBRL(v), "Líquido"])} />
                  <Line type="monotone" dataKey="total" dot={false} stroke="rgba(255,190,90,0.95)" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Líquido mensal" rightHint="(agregado por mês)">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={liquidoMensal} margin={{ top: 18, right: 16, bottom: 34, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="label" {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [formatBRL(v), "Líquido"])} />
                  <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="rgba(255,190,90,0.88)" stroke="rgba(255,255,255,0.06)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}

        {/* Slide 5: Top modelos */}
        {slides[slide]?.id === "top_modelos" && (
          <Panel title="Top 10 modelos mais vendidos" rightHint="(período filtrado)">
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
        )}

        {/* Slide 6: Cidade */}
        {slides[slide]?.id === "cidade" && (
          <Panel title="Vendas por cidade" rightHint="(filial_venda > origem)">
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
        )}
      </div>

      {/* estilos mínimos locais (pra não quebrar o resto do site) */}
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

/* ================= COMPONENTES VISUAIS ================= */
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