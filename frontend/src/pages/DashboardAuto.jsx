
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
  PieChart,
  Pie,
  Legend,
  LabelList,
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

function formatDateBR(d) {
  return new Date(d).toLocaleDateString("pt-BR");
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 dom, 1 seg...
  const diff = (day === 0 ? -6 : 1) - day; // volta pra segunda
  return addDays(x, diff);
}

function startOfMonth(d) {
  const x = startOfDay(d);
  return new Date(x.getFullYear(), x.getMonth(), 1);
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
  const intervalMs = 7000; // 7s por slide
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

  /* ================= FILTRAGEM ================= */
  const motosFiltradas = useMemo(() => {
    return (vendasMotos || []).filter((v) => {
      const dataVenda = new Date(v.created_at);

      const okData =
        (!dataInicio || dataVenda >= new Date(`${dataInicio}T00:00:00`)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));

      const emp = getEmpresa(v);
      const okEmpresa = empresaFiltro === "TODAS" || emp === empresaFiltro;

      return okData && okEmpresa;
    });
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const pecasFiltradas = useMemo(() => {
    return (vendasPecas || []).filter((v) => {
      const dataVenda = new Date(v.created_at);
      const okData =
        (!dataInicio || dataVenda >= new Date(`${dataInicio}T00:00:00`)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));
      return okData;
    });
  }, [vendasPecas, dataInicio, dataFim]);

  /* ================= KPIs ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;

    const faturamentoPecas = pecasFiltradas.reduce((acc, v) => acc + toNumber(v.total), 0);
    const qtdVendasPecas = pecasFiltradas.length;
    const ticketMedioPecas = qtdVendasPecas > 0 ? faturamentoPecas / qtdVendasPecas : 0;

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      faturamentoPecas,
      qtdVendasPecas,
      ticketMedioPecas,
    };
  }, [motosFiltradas, pecasFiltradas]);

  /* ================= GRÁFICOS ================= */

  // 1) Vendas por dia (motos)
  const motosPorDia = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const key = formatDateBR(v.created_at);
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => {
        const [da, ma, aa] = a.dia.split("/").map(Number);
        const [db, mb, ab] = b.dia.split("/").map(Number);
        return new Date(aa, ma - 1, da) - new Date(ab, mb - 1, db);
      });
  }, [motosFiltradas]);

  // 2) Top 10 modelos (motos)
  const topModelos = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const key = (v.modelo || "SEM MODELO").toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([modelo, total]) => ({ modelo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);

  // 3) Vendas por cidade (motos) -> usa filial_venda (se não tiver, cai em filial_origem/filial)
  const vendasPorCidade = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const cidade = (v.filial_venda || v.filial_origem || v.filial || "N/I").toUpperCase();
      map.set(cidade, (map.get(cidade) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total);
  }, [motosFiltradas]);

  // 4) Vendas acumuladas últimos 7 dias (janela móvel) — desde 07/01/2026 (igual seu print)
  const rolling7Dias = useMemo(() => {
    const start = new Date("2026-01-07T00:00:00");
    const end = new Date();

    const startDay = startOfDay(start);
    const endDay = startOfDay(end);

    // vendas por dia (data -> quantidade)
    const porDia = new Map();
    motosFiltradas.forEach((v) => {
      const day = startOfDay(new Date(v.created_at)).getTime();
      porDia.set(day, (porDia.get(day) || 0) + 1);
    });

    const days = [];
    for (let d = new Date(startDay); d <= endDay; d = addDays(d, 1)) {
      days.push(startOfDay(d));
    }

    return days.map((day) => {
      let total7d = 0;
      for (let i = 0; i < 7; i++) {
        const w = addDays(day, -i).getTime();
        total7d += porDia.get(w) || 0;
      }

      const label = day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      return { dia: label, total7d };
    });
  }, [motosFiltradas]);

  // 5) Líquido semanal (motos)
  const liquidoSemanal = useMemo(() => {
    const map = new Map(); // key: mondayTime -> total
    motosFiltradas.forEach((v) => {
      const d = new Date(v.created_at);
      const monday = startOfWeekMonday(d).getTime();
      map.set(monday, (map.get(monday) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([mondayTime, total]) => {
        const monday = new Date(Number(mondayTime));
        const label = monday.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return { semana: label, total: Math.round(total * 100) / 100 };
      })
      .sort((a, b) => {
        // ordena por mondayTime de forma segura
        const parse = (s) => {
          const [d, m] = s.split("/").map(Number);
          // ano não vem no label -> aproxima com ano atual; serve para TV
          const year = new Date().getFullYear();
          return new Date(year, m - 1, d).getTime();
        };
        return parse(a.semana) - parse(b.semana);
      });
  }, [motosFiltradas]);

  // 6) Líquido mensal (motos)
  const liquidoMensal = useMemo(() => {
    const map = new Map(); // key: YYYY-MM -> total
    motosFiltradas.forEach((v) => {
      const d = new Date(v.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + calcLiquidoMoto(v));
    });

    return Array.from(map.entries())
      .map(([mes, total]) => ({ mes, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.mes.localeCompare(b.mes));
  }, [motosFiltradas]);

  /* ================= SLIDES ================= */
  const slides = useMemo(() => {
    return [
      { id: "kpis", title: "Resumo Geral" },
      { id: "motos_dia", title: "Vendas de Motos por Dia" },
      { id: "rolling7", title: "Vendas (Últimos 7 dias — Janela Móvel)" },
      { id: "liq_sem", title: "Líquido Semanal (Motos)" },
      { id: "liq_mes", title: "Líquido Mensal (Motos)" },
      { id: "top_modelos", title: "Top 10 Modelos (Motos)" },
      { id: "cidade", title: "Vendas por Cidade (Motos)" },
    ];
  }, []);

  function nextSlide() {
    setSlide((s) => (s + 1) % slides.length);
  }
  function prevSlide() {
    setSlide((s) => (s - 1 + slides.length) % slides.length);
  }

  useEffect(() => {
    if (!autoPlay) return;

    timerRef.current = setInterval(() => {
      nextSlide();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, intervalMs]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key.toLowerCase() === " ") setAutoPlay((a) => !a);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= UI ================= */
  return (
    <div className="dash-auto">
      <div className="dash-topbar">
        <div className="dash-title">
          <h2>📺 Dashboard (Modo TV)</h2>
          <small>{slides[slide]?.title}</small>
        </div>

        <div className="dash-actions">
          <button onClick={() => nav("/home")}>⬅ Voltar</button>
          <button onClick={prevSlide}>◀</button>
          <button onClick={() => setAutoPlay((a) => !a)}>{autoPlay ? "⏸ Pausar" : "▶ Play"}</button>
          <button onClick={nextSlide}>▶</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="dash-filtros">
        <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />

        <div className="dash-quick">
          <button onClick={aplicarHoje}>Hoje</button>
          <button onClick={aplicar7Dias}>7d</button>
          <button onClick={aplicar30Dias}>30d</button>
          <button onClick={aplicarMesAtual}>Mês</button>
          <button onClick={limparDatas}>Limpar</button>
        </div>
      </div>

      {/* DOTS */}
      <div className="dash-dots">
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
      <div className="dash-slide">
        {slides[slide]?.id === "kpis" && (
          <div className="grid-kpis">
            <KpiCard title="Faturamento Motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido Motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Faturamento Peças" value={formatBRL(kpis.faturamentoPecas)} />
            <KpiCard title="Vendas Peças" value={kpis.qtdVendasPecas} />
            <KpiCard title="Ticket Médio Peças" value={formatBRL(kpis.ticketMedioPecas)} />
          </div>
        )}

        {slides[slide]?.id === "motos_dia" && (
          <Panel title="Vendas de motos por dia">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={motosPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "rolling7" && (
          <Panel title="Vendas acumuladas nos últimos 7 dias (janela móvel) — desde 07/01/2026">
            <ResponsiveContainer width="100%" height={460}>
              <BarChart data={rolling7Dias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="dia"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={90}
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total7d">
                  <LabelList dataKey="total7d" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "liq_sem" && (
          <Panel title="Líquido semanal (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={liquidoSemanal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" />
                <YAxis />
                <Tooltip formatter={(v) => formatBRL(v)} />
                <Line type="monotone" dataKey="total" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "liq_mes" && (
          <Panel title="Líquido mensal (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={liquidoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(v) => formatBRL(v)} />
                <Bar dataKey="total">
                  <LabelList dataKey="total" position="top" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "top_modelos" && (
          <Panel title="Top 10 modelos mais vendidos">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={topModelos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="modelo" width={160} />
                <Tooltip />
                <Bar dataKey="total">
                  <LabelList dataKey="total" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "cidade" && (
          <Panel title="Vendas por cidade (motos)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vendasPorCidade} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="cidade" width={170} />
                <Tooltip />
                <Bar dataKey="total">
                  <LabelList dataKey="total" position="right" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}
      </div>

      <div className="dash-hint">
        Dica: <b>Espaço</b> pausa/play • <b>←/→</b> troca slide
      </div>
    </div>
  );
}

/* ================= COMPONENTES VISUAIS ================= */
function KpiCard({ title, value }) {
  return (
    <div className="kpi">
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="panel-body">{children}</div>
    </div>
  );
}