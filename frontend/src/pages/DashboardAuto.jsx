/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DashboardAuto.css";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
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

function isoDateOnly(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString("pt-BR");
}

function parseISODateOnly(s) {
  // "YYYY-MM-DD" => Date at 00:00 local
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function clampDateRange(createdAt, dataInicio, dataFim) {
  const dt = new Date(createdAt);
  if (Number.isNaN(dt.getTime())) return false;

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

  // se tiver repasse, não usa compra
  const base = repasse > 0 ? repasse : compra;

  return valor - base - gasolina - brindeDesc;
}

/* ================= UI HELPERS ================= */
const gridSoft = { stroke: "rgba(255,255,255,0.06)", vertical: false };
const axisSoft = {
  tick: { fill: "rgba(255,255,255,0.65)", fontSize: 11 },
  axisLine: { stroke: "rgba(255,255,255,0.10)" },
  tickLine: { stroke: "rgba(255,255,255,0.08)" },
};

function tooltipProps(formatter) {
  return {
    contentStyle: {
      background: "rgba(10,12,14,0.92)",
      border: "1px solid rgba(255,255,255,0.10)",
      borderRadius: 12,
      color: "rgba(255,255,255,0.9)",
      boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
    },
    labelStyle: { color: "rgba(255,255,255,0.70)" },
    itemStyle: { color: "rgba(255,255,255,0.90)" },
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
  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const intervalMs = 8000; // 8s por slide
  const timerRef = useRef(null);

  useEffect(() => {
    api.get("/vendas-motos")
      .then(res => setVendasMotos(res.data || []))
      .catch(() => setVendasMotos([]));

    api.get("/vendas")
      .then(res => setVendasPecas(res.data || []))
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

  /* ================= FILTRAGEM ================= */
  const motosFiltradas = useMemo(() => {
    return (vendasMotos || [])
      .filter(v => clampDateRange(v.created_at, dataInicio, dataFim))
      .filter(v => {
        const emp = getEmpresa(v);
        return empresaFiltro === "TODAS" || emp === empresaFiltro;
      });
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const pecasFiltradas = useMemo(() => {
    return (vendasPecas || [])
      .filter(v => clampDateRange(v.created_at, dataInicio, dataFim));
  }, [vendasPecas, dataInicio, dataFim]);

  /* ================= KPIs ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;

    const faturamentoPecas = pecasFiltradas.reduce((acc, v) => acc + toNumber(v.total), 0);
    const qtdVendasPecas = pecasFiltradas.length;
    const ticketMedioPecas = qtdVendasPecas > 0 ? faturamentoPecas / qtdVendasPecas : 0;

    // “últimos 7 dias” (janela móvel) — baseado em data do sistema (não depende de filtro)
    const hoje = new Date();
    const di = new Date();
    di.setDate(hoje.getDate() - 6);
    di.setHours(0, 0, 0, 0);
    const motos7d = (vendasMotos || []).filter(v => {
      const dt = new Date(v.created_at);
      return !Number.isNaN(dt.getTime()) && dt >= di && dt <= hoje;
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

  // 1) Vendas por dia (motos)
  const motosPorDia = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const key = isoDateOnly(v.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([diaISO, total]) => ({
        diaISO,
        dia: formatDateBR(diaISO),
        total,
      }))
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO));
  }, [motosFiltradas]);

  // 2) Vendas acumuladas nos últimos 7 dias (janela móvel) — estilo do seu print
  const vendas7DiasJanelaMovel = useMemo(() => {
    // usa motosFiltradas (respeita filtros). Se quiser sempre global, troque por vendasMotos.
    const base = motosFiltradas;

    const countByDay = new Map();
    base.forEach(v => {
      const k = isoDateOnly(v.created_at);
      if (!k) return;
      countByDay.set(k, (countByDay.get(k) || 0) + 1);
    });

    const days = Array.from(countByDay.keys()).sort(); // yyyy-mm-dd
    if (days.length === 0) return [];

    // transforma em lista contínua (preenche dias faltando com 0) pra janela ficar correta
    const start = parseISODateOnly(days[0]);
    const end = parseISODateOnly(days[days.length - 1]);
    if (!start || !end) return [];

    const allDays = [];
    const cur = new Date(start);
    while (cur <= end) {
      const k = isoDateOnly(cur);
      allDays.push(k);
      cur.setDate(cur.getDate() + 1);
    }

    // prefix sum
    const counts = allDays.map(k => countByDay.get(k) || 0);
    const prefix = [0];
    for (let i = 0; i < counts.length; i++) prefix.push(prefix[i] + counts[i]);

    const out = allDays.map((k, i) => {
      const left = Math.max(0, i - 6);
      const soma7 = prefix[i + 1] - prefix[left];
      return {
        diaISO: k,
        dia: formatDateBR(k),
        total: soma7,
      };
    });

    // pra não ficar MUITO longo na TV, limita os últimos 45 pontos (ajuste se quiser)
    return out.slice(-45);
  }, [motosFiltradas]);

  // 3) Líquido por semana (motos) — soma semanal
  const liquidoSemanal = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const dt = new Date(v.created_at);
      if (Number.isNaN(dt.getTime())) return;

      // semana começando na segunda (pt-BR)
      const d = new Date(dt);
      const day = (d.getDay() + 6) % 7; // 0=segunda
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);

      const key = isoDateOnly(d); // monday
      map.set(key, (map.get(key) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([semanaISO, total]) => ({
        semanaISO,
        semana: `Semana ${formatDateBR(semanaISO)}`,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.semanaISO.localeCompare(b.semanaISO))
      .slice(-20);
  }, [motosFiltradas]);

  // 4) Líquido por mês (motos)
  const liquidoMensal = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const dt = new Date(v.created_at);
      if (Number.isNaN(dt.getTime())) return;
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
      map.set(key, (map.get(key) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([mes, total]) => ({
        mes,
        label: mes,
        total: Math.round(total * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-18);
  }, [motosFiltradas]);

  // 5) Top 10 modelos (motos)
  const topModelos = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const key = (v.modelo || "SEM MODELO").toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([modelo, total]) => ({ modelo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);

  // 6) Vendas por cidade (motos) — usando filial_venda (quando existir); senão usa filial_origem
  const vendasPorCidade = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const city = (v.filial_venda || v.cidade || v.filial_origem || v.filial || "N/I").toUpperCase();
      map.set(city, (map.get(city) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [motosFiltradas]);

  /* ================= SLIDES ================= */
  const slides = useMemo(() => {
    return [
      { id: "kpis", title: "Resumo Geral" },
      { id: "rolling7", title: "Vendas acumuladas (últimos 7 dias)" },
      { id: "motos_dia", title: "Vendas de Motos por Dia" },
      { id: "liq_sem", title: "Líquido Semanal (Motos)" },
      { id: "liq_mes", title: "Líquido Mensal (Motos)" },
      { id: "top_modelos", title: "Top 10 Modelos (Motos)" },
      { id: "cidade", title: "Vendas por Cidade (Motos)" },
    ];
  }, []);

  function nextSlide() {
    setSlide(s => (s + 1) % slides.length);
  }
  function prevSlide() {
    setSlide(s => (s - 1 + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!autoPlay) return;

    timerRef.current = setInterval(() => nextSlide(), intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, intervalMs]);

  // teclado
  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key.toLowerCase() === " ") setAutoPlay(a => !a);
      if (e.key.toLowerCase() === "f") {
        // fullscreen (browser)
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= UI (FULLSCREEN TV) ================= */
  return (
    <div
      className="dash-auto"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "radial-gradient(1200px 800px at 20% 0%, rgba(80,120,255,0.08), transparent 60%), #07090c",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      <div className="dash-topbar" style={{ padding: "18px 22px" }}>
        <div className="dash-title">
          <h2 style={{ margin: 0, fontSize: 22, letterSpacing: 0.2 }}>
            MotoNow • <span style={{ opacity: 0.75 }}>Dashboard TV</span>
          </h2>
          <small style={{ opacity: 0.70 }}>{slides[slide]?.title}</small>
        </div>

        <div className="dash-actions">
          <button onClick={() => nav("/home")}>⬅ Voltar</button>
          <button onClick={prevSlide}>◀</button>
          <button onClick={() => setAutoPlay(a => !a)}>
            {autoPlay ? "⏸ Pausar" : "▶ Play"}
          </button>
          <button onClick={nextSlide}>▶</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="dash-filtros" style={{ padding: "0 22px 12px 22px" }}>
        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />

        <div className="dash-quick">
          <button onClick={aplicarHoje}>Hoje</button>
          <button onClick={aplicar7Dias}>7d</button>
          <button onClick={aplicar30Dias}>30d</button>
          <button onClick={aplicarMesAtual}>Mês</button>
          <button onClick={limparDatas}>Limpar</button>
        </div>
      </div>

      {/* DOTS */}
      <div className="dash-dots" style={{ padding: "0 22px 10px 22px" }}>
        {slides.map((s, idx) => (
          <button
            key={s.id}
            className={`dot ${idx === slide ? "active" : ""}`}
            onClick={() => setSlide(idx)}
            title={s.title}
          />
        ))}
      </div>

      {/* SLIDE CONTENT */}
      <div className="dash-slide" style={{ height: "calc(100vh - 160px)", padding: "0 22px 18px 22px" }}>
        {slides[slide]?.id === "kpis" && (
          <div className="grid-kpis">
            <KpiCard title="Faturamento Motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido Motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Faturamento Peças" value={formatBRL(kpis.faturamentoPecas)} />
            <KpiCard title="Vendas Peças" value={kpis.qtdVendasPecas} />
            <KpiCard title="Ticket Médio Peças" value={formatBRL(kpis.ticketMedioPecas)} />
            <KpiCard title="Motos (últimos 7 dias)" value={kpis.motos7d} />
          </div>
        )}

        {slides[slide]?.id === "rolling7" && (
          <Panel
            title={`Vendas acumuladas nos últimos 7 dias (janela móvel)`}
            subtitle={dataInicio || dataFim ? "Respeitando filtro selecionado" : "Sem filtro de data"}
          >
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vendas7DiasJanelaMovel} margin={{ top: 18, right: 16, bottom: 44, left: 6 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis
                  dataKey="dia"
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  {...axisSoft}
                />
                <YAxis allowDecimals={false} {...axisSoft} />
                <Tooltip {...tooltipProps((v) => [v, "Total (7 dias)"])} />
                <Bar
                  dataKey="total"
                  radius={[10, 10, 0, 0]}
                  fill="rgba(120,160,255,0.85)"
                  stroke="rgba(255,255,255,0.08)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "motos_dia" && (
          <Panel title="Vendas de motos por dia">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={motosPorDia} margin={{ top: 18, right: 16, bottom: 44, left: 6 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis
                  dataKey="dia"
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  {...axisSoft}
                />
                <YAxis allowDecimals={false} {...axisSoft} />
                <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                <Bar
                  dataKey="total"
                  radius={[10, 10, 0, 0]}
                  fill="rgba(110,240,200,0.80)"
                  stroke="rgba(255,255,255,0.08)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "liq_sem" && (
          <Panel title="Líquido semanal (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={liquidoSemanal} margin={{ top: 18, right: 16, bottom: 40, left: 6 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis dataKey="semana" angle={-20} textAnchor="end" height={55} {...axisSoft} />
                <YAxis {...axisSoft} />
                <Tooltip {...tooltipProps((v) => [formatBRL(v), "Líquido"])} />
                <Line
                  type="monotone"
                  dataKey="total"
                  dot={false}
                  stroke="rgba(255,190,90,0.95)"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "liq_mes" && (
          <Panel title="Líquido mensal (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={liquidoMensal} margin={{ top: 18, right: 16, bottom: 40, left: 6 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis dataKey="label" {...axisSoft} />
                <YAxis {...axisSoft} />
                <Tooltip {...tooltipProps((v) => [formatBRL(v), "Líquido"])} />
                <Bar
                  dataKey="total"
                  radius={[10, 10, 0, 0]}
                  fill="rgba(255,190,90,0.85)"
                  stroke="rgba(255,255,255,0.08)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "top_modelos" && (
          <Panel title="Top 10 modelos mais vendidos">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={topModelos} layout="vertical" margin={{ top: 12, right: 16, bottom: 12, left: 20 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis type="number" allowDecimals={false} {...axisSoft} />
                <YAxis
                  type="category"
                  dataKey="modelo"
                  width={180}
                  tick={{ fill: "rgba(255,255,255,0.70)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                <Bar
                  dataKey="total"
                  radius={[0, 10, 10, 0]}
                  fill="rgba(160,120,255,0.85)"
                  stroke="rgba(255,255,255,0.08)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "cidade" && (
          <Panel title="Vendas por cidade (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vendasPorCidade} layout="vertical" margin={{ top: 12, right: 16, bottom: 12, left: 20 }}>
                <CartesianGrid {...gridSoft} />
                <XAxis type="number" allowDecimals={false} {...axisSoft} />
                <YAxis
                  type="category"
                  dataKey="cidade"
                  width={180}
                  tick={{ fill: "rgba(255,255,255,0.70)", fontSize: 12 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
                  tickLine={{ stroke: "rgba(255,255,255,0.06)" }}
                />
                <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                <Bar
                  dataKey="total"
                  radius={[0, 10, 10, 0]}
                  fill="rgba(110,240,200,0.80)"
                  stroke="rgba(255,255,255,0.08)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
      </div>

      <div
        className="dash-hint"
        style={{
          padding: "0 22px 14px 22px",
          opacity: 0.65,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span>Dica: <b>Espaço</b> pausa/play • <b>←/→</b> troca slide</span>
        <span><b>F</b> tela cheia</span>
      </div>
    </div>
  );
}

/* ================= COMPONENTES VISUAIS ================= */
function KpiCard({ title, value }) {
  return (
    <div
      className="kpi"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="kpi-title" style={{ opacity: 0.75, fontSize: 12, letterSpacing: 0.3 }}>
        {title}
      </div>
      <div className="kpi-value" style={{ fontSize: 26, fontWeight: 700, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <div
      className="panel"
      style={{
        height: "100%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 14px 34px rgba(0,0,0,0.40)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="panel-title" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, opacity: 0.65 }}>{subtitle}</div> : null}
      </div>
      <div className="panel-body" style={{ marginTop: 10 }}>
        {children}
      </div>
    </div>
  );
}