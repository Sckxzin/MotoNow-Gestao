import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DashboardAuto.css";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
  PieChart, Pie, Legend
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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, days) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function isBetween(date, start, end) {
  return date >= start && date <= end;
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
  const intervalMs = 7000;
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
    return (vendasMotos || []).filter(v => {
      const dataVenda = new Date(v.created_at);
      const okData =
        (!dataInicio || dataVenda >= new Date(dataInicio)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));

      const emp = getEmpresa(v);
      const okEmpresa = empresaFiltro === "TODAS" || emp === empresaFiltro;

      return okData && okEmpresa;
    });
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const pecasFiltradas = useMemo(() => {
    return (vendasPecas || []).filter(v => {
      const dataVenda = new Date(v.created_at);
      const okData =
        (!dataInicio || dataVenda >= new Date(dataInicio)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));
      return okData;
    });
  }, [vendasPecas, dataInicio, dataFim]);

  /* ================= KPIs BASE ================= */
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
      ticketMedioPecas
    };
  }, [motosFiltradas, pecasFiltradas]);

  /* ================= GRÁFICOS ================= */

  // 1) Vendas por dia (motos)
  const motosPorDia = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
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

  // 2) Top modelos (motos)
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

  // 3) Vendas por cidade (usa filial_venda; se não tiver, cai em filial_origem)
  const vendasPorCidade = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach(v => {
      const cidade = (v.filial_venda || v.filial_origem || "N/I").toUpperCase();
      map.set(cidade, (map.get(cidade) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total);
  }, [motosFiltradas]);

  // 4) Acumulado últimos 7 dias (sempre relativo a HOJE, independe do filtro de data)
  const acumulado7Dias = useMemo(() => {
    const hoje = startOfDay(new Date());
    const inicio = addDays(hoje, -6); // 7 dias incluindo hoje

    // cria os 7 dias zerados
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(inicio, i);
      dias.push({
        date: d,
        dia: d.toLocaleDateString("pt-BR"),
        vendas: 0,
        acumulado: 0
      });
    }

    const filtradas = (vendasMotos || []).filter(v => {
      const d = startOfDay(new Date(v.created_at));
      const okJanela = isBetween(d, inicio, hoje);
      const emp = getEmpresa(v);
      const okEmpresa = empresaFiltro === "TODAS" || emp === empresaFiltro;
      return okJanela && okEmpresa;
    });

    filtradas.forEach(v => {
      const d = startOfDay(new Date(v.created_at));
      const idx = Math.floor((d - inicio) / (24 * 60 * 60 * 1000));
      if (idx >= 0 && idx < 7) dias[idx].vendas += 1;
    });

    let acc = 0;
    dias.forEach(row => {
      acc += row.vendas;
      row.acumulado = acc;
    });

    return dias.map(({ dia, vendas, acumulado }) => ({ dia, vendas, acumulado }));
  }, [vendasMotos, empresaFiltro]);

  // 5) Líquido semanal e mensal (sempre relativo a HOJE, independe do filtro de data)
  const liquidoSemanalMensal = useMemo(() => {
    const hoje = startOfDay(new Date());

    const inicioSemana = addDays(hoje, -6); // últimos 7 dias
    const inicioMes = addDays(hoje, -29);   // últimos 30 dias

    const base = (vendasMotos || []).filter(v => {
      const emp = getEmpresa(v);
      return empresaFiltro === "TODAS" || emp === empresaFiltro;
    });

    let liquido7 = 0;
    let liquido30 = 0;

    base.forEach(v => {
      const d = startOfDay(new Date(v.created_at));
      const liq = calcLiquidoMoto(v);

      if (isBetween(d, inicioSemana, hoje)) liquido7 += liq;
      if (isBetween(d, inicioMes, hoje)) liquido30 += liq;
    });

    return {
      liquido7,
      liquido30
    };
  }, [vendasMotos, empresaFiltro]);

  /* ================= SLIDES ================= */
  const slides = useMemo(() => {
    return [
      { id: "motos_dia", title: "Vendas de Motos por Dia" },
      { id: "liq_sem_mes", title: "Líquido Semanal e Mensal" },
      { id: "top_modelos", title: "Top 10 Modelos Mais Vendidos" },
      { id: "acum_7d", title: "Vendas Acumuladas (Últimos 7 dias)" },
      { id: "cidade", title: "Vendas por Cidade" },
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
      if (e.key.toLowerCase() === " ") setAutoPlay(a => !a);
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
          <button onClick={() => setAutoPlay(a => !a)}>
            {autoPlay ? "⏸ Pausar" : "▶ Play"}
          </button>
          <button onClick={nextSlide}>▶</button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="dash-filtros">
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
        {slides[slide]?.id === "motos_dia" && (
          <Panel title="Vendas de motos por dia (filtros aplicados)">
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

        {slides[slide]?.id === "liq_sem_mes" && (
          <div className="grid-2">
            <Panel title="Líquido (Últimos 7 dias)">
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 44, fontWeight: 800 }}>
                  {formatBRL(liquidoSemanalMensal.liquido7)}
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Janela: últimos 7 dias (inclui hoje)
                </div>
              </div>
            </Panel>

            <Panel title="Líquido (Últimos 30 dias)">
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 44, fontWeight: 800 }}>
                  {formatBRL(liquidoSemanalMensal.liquido30)}
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>
                  Janela: últimos 30 dias (inclui hoje)
                </div>
              </div>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "top_modelos" && (
          <Panel title="Top 10 modelos mais vendidos (filtros aplicados)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={topModelos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="modelo" width={160} />
                <Tooltip />
                <Bar dataKey="total" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "acum_7d" && (
          <Panel title="Vendas acumuladas (últimos 7 dias)">
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={acumulado7Dias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="acumulado" dot={false} />
                <Line type="monotone" dataKey="vendas" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "cidade" && (
          <Panel title="Vendas por cidade (filtros aplicados)">
            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={vendasPorCidade}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cidade" interval={0} angle={-15} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" />
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
function Panel({ title, children }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      <div className="panel-body">{children}</div>
    </div>
  );
}