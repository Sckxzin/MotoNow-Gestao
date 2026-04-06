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

function normPay(s) {
  const x = String(s || "").trim().toUpperCase();
  if (!x) return "N/I";
  if (x.includes("PIX")) return "PIX";
  if (x.includes("DÉBITO") || x.includes("DEBIT")) return "DÉBITO";
  if (x.includes("CRÉDITO") || x.includes("CRED")) return "CRÉDITO";
  if (x.includes("A VISTA") || x.includes("AVISTA") || x.includes("DINHEIRO")) return "À VISTA";
  if (x.includes("BOLETO")) return "BOLETO";
  if (x.includes("FINAN")) return "FINANCIAMENTO";
  return x;
}

/* ================= CÁLCULOS MOTOS ================= */
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
  bg: "linear-gradient(180deg, #06080d 0%, #0a0f18 100%)",
  card: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
  border: "1px solid rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.95)",
  subtext: "rgba(255,255,255,0.68)",
  shadow: "0 18px 50px rgba(0,0,0,0.45)",
  grid: { stroke: "rgba(255,255,255,0.04)", vertical: false },
  axis: {
    tick: { fill: "rgba(255,255,255,0.60)", fontSize: 11 },
    axisLine: { stroke: "rgba(255,255,255,0.08)" },
    tickLine: { stroke: "rgba(255,255,255,0.05)" },
  },
};

function tooltipProps(formatter) {
  return {
    contentStyle: {
      background: "rgba(10,12,14,0.97)",
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

export default function DashboardAuto() {
  const nav = useNavigate();

  const [vendasMotos, setVendasMotos] = useState([]);
  const [vendasPecas, setVendasPecas] = useState([]);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");

  const slides = useMemo(
    () => [
      { id: "kpis", title: "Resumo executivo" },
      { id: "fat_dia", title: "Faturamento por dia" },
      { id: "estoque_motos", title: "Fluxo de estoque de motos" },
      { id: "fechamento_loja", title: "Fechamento por loja" },
      { id: "top_modelos", title: "Modelos, cidades e pagamento" },
      { id: "pecas", title: "Peças" },
      { id: "resumo_final", title: "Resumo final" },
    ],
    []
  );

  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const intervalMs = 8000;
  const timerRef = useRef(null);

  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendasMotos(res.data || [])).catch(() => setVendasMotos([]));
    api.get("/vendas").then((res) => setVendasPecas(res.data || [])).catch(() => setVendasPecas([]));
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

  const motosFiltradas = useMemo(() => {
    return (vendasMotos || [])
      .filter((v) => clampDateRange(v.data_venda || v.created_at, dataInicio, dataFim))
      .filter((v) => empresaFiltro === "TODAS" || getEmpresa(v) === empresaFiltro);
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  const pecasFiltradas = useMemo(() => {
    return (vendasPecas || []).filter((v) => clampDateRange(v.created_at, dataInicio, dataFim));
  }, [vendasPecas, dataInicio, dataFim]);

  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;

    const faturamentoPecas = pecasFiltradas.reduce((acc, v) => acc + toNumber(v.total), 0);
    const qtdVendasPecas = pecasFiltradas.length;
    const ticketMedioPecas = qtdVendasPecas ? faturamentoPecas / qtdVendasPecas : 0;

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      faturamentoPecas,
      qtdVendasPecas,
      ticketMedioPecas,
    };
  }, [motosFiltradas, pecasFiltradas]);

  const motosPorDia = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const key = isoDateOnly(v.data_venda || v.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + toNumber(v.valor));
    });

    return Array.from(map.entries())
      .map(([diaISO, total]) => ({
        diaISO,
        dia: formatDateBRFromISO(diaISO),
        total,
      }))
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .slice(-45);
  }, [motosFiltradas]);

  const pecasPorDia = useMemo(() => {
    const map = new Map();
    pecasFiltradas.forEach((v) => {
      const key = isoDateOnly(v.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + toNumber(v.total));
    });

    return Array.from(map.entries())
      .map(([diaISO, total]) => ({
        diaISO,
        dia: formatDateBRFromISO(diaISO),
        total,
      }))
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .slice(-45);
  }, [pecasFiltradas]);

  const fluxoEstoqueMotos = useMemo(() => {
    const map = new Map();

    (vendasMotos || []).forEach((v) => {
      const entrada = isoDateOnly(v.created_at);
      const saida = isoDateOnly(v.data_venda);

      if (entrada) {
        if (!map.has(entrada)) map.set(entrada, { diaISO: entrada, entradas: 0, saidas: 0 });
        map.get(entrada).entradas += 1;
      }

      if (saida) {
        if (!map.has(saida)) map.set(saida, { diaISO: saida, entradas: 0, saidas: 0 });
        map.get(saida).saidas += 1;
      }
    });

    let saldo = 0;

    return Array.from(map.values())
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .map((d) => {
        saldo += d.entradas - d.saidas;
        return {
          dia: formatDateBRFromISO(d.diaISO),
          entradas: d.entradas,
          saidas: d.saidas,
          saldo,
        };
      })
      .slice(-45);
  }, [vendasMotos]);

  const fechamentoPorLoja = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const loja = String(v.filial_venda || v.filial_origem || "N/I").toUpperCase();

      if (!map.has(loja)) {
        map.set(loja, { loja, faturamento: 0, liquido: 0, motos: 0 });
      }

      const cur = map.get(loja);
      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquidoMoto(v);
      cur.motos += 1;
      map.set(loja, cur);
    });

    return Array.from(map.values()).sort((a, b) => b.faturamento - a.faturamento);
  }, [motosFiltradas]);

  const topModelos = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const key = String(v.modelo || "SEM MODELO").toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([modelo, total]) => ({ modelo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);

  const vendasPorCidade = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const cidade = String(v.filial_venda || v.filial_origem || "N/I").toUpperCase();
      map.set(cidade, (map.get(cidade) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([cidade, total]) => ({ cidade, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [motosFiltradas]);

  const pagamentoMotos = useMemo(() => {
    const map = new Map();
    motosFiltradas.forEach((v) => {
      const forma = normPay(v.forma_pagamento);
      map.set(forma, (map.get(forma) || 0) + 1);
    });
    return Array.from(map.entries()).map(([forma, qtd]) => ({ forma, qtd }));
  }, [motosFiltradas]);

  const topPecas = useMemo(() => {
    const map = new Map();

    pecasFiltradas.forEach((v) => {
      const itens = Array.isArray(v.itens) ? v.itens : [];
      itens.forEach((it) => {
        const nome = String(it.nome || "SEM NOME").toUpperCase();
        map.set(nome, (map.get(nome) || 0) + toNumber(it.quantidade));
      });
    });

    return Array.from(map.entries())
      .map(([peca, qtd]) => ({ peca, qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 10);
  }, [pecasFiltradas]);

  const resumoFinal = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const faturamentoPecas = pecasFiltradas.reduce((acc, v) => acc + toNumber(v.total), 0);
    const totalMotos = motosFiltradas.length;
    const totalPecas = pecasFiltradas.length;
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);

    return {
      faturamentoMotos,
      faturamentoPecas,
      totalMotos,
      totalPecas,
      faturamentoGeral: faturamentoMotos + faturamentoPecas,
      liquidoMotos,
    };
  }, [motosFiltradas, pecasFiltradas]);

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
      <div style={{ padding: "18px 22px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>MotoNow Dashboard</div>
          <div style={{ fontSize: 13, color: THEME.subtext }}>
            {slides[slide]?.title} • {empresaFiltro === "TODAS" ? "Todas empresas" : empresaFiltro}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="tv-btn" onClick={() => nav("/home")}>⬅</button>
          <button className="tv-btn" onClick={prevSlide}>◀</button>
          <button className="tv-btn" onClick={() => setAutoPlay((a) => !a)}>{autoPlay ? "⏸" : "▶"}</button>
          <button className="tv-btn" onClick={nextSlide}>▶</button>
        </div>
      </div>

      <div style={{ padding: "0 22px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <select className="tv-select" value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <input className="tv-input" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        <input className="tv-input" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />

        <button className="tv-chip" onClick={aplicarHoje}>Hoje</button>
        <button className="tv-chip" onClick={aplicar7Dias}>7d</button>
        <button className="tv-chip" onClick={aplicar30Dias}>30d</button>
        <button className="tv-chip" onClick={aplicarMesAtual}>Mês</button>
        <button className="tv-chip" onClick={limparDatas}>Limpar</button>
      </div>

      <div style={{ padding: "0 22px 10px", display: "flex", gap: 8 }}>
        {slides.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setSlide(idx)}
            style={{
              width: idx === slide ? 28 : 10,
              height: 10,
              borderRadius: 999,
              border: "none",
              background: idx === slide ? "#fff" : "rgba(255,255,255,0.22)",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      <div style={{ height: "calc(100vh - 150px)", padding: "0 22px 18px" }}>
        {slides[slide]?.id === "kpis" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Faturamento peças" value={formatBRL(kpis.faturamentoPecas)} />
            <KpiCard title="Ticket médio peças" value={formatBRL(kpis.ticketMedioPecas)} />
            <KpiCard title="Motos vendidas" value={kpis.totalMotos} />
            <KpiCard title="Vendas de peças" value={kpis.qtdVendasPecas} />
          </div>
        )}

        {slides[slide]?.id === "fat_dia" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Panel title="Faturamento motos por dia">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={motosPorDia}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [formatBRL(v), "Motos"])} />
                  <Bar dataKey="total" fill="rgba(110,240,200,0.82)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Faturamento peças por dia">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={pecasPorDia}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [formatBRL(v), "Peças"])} />
                  <Bar dataKey="total" fill="rgba(120,160,255,0.88)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "estoque_motos" && (
          <Panel title="Fluxo de estoque de motos">
            <ResponsiveContainer width="100%" height={470}>
              <BarChart data={fluxoEstoqueMotos}>
                <CartesianGrid {...THEME.grid} />
                <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                <YAxis {...THEME.axis} />
                <Tooltip {...tooltipProps((v, name) => [v, name])} />
                <Legend />
                <Bar dataKey="entradas" fill="rgba(110,240,200,0.82)" />
                <Bar dataKey="saidas" fill="rgba(255,120,120,0.82)" />
                <Bar dataKey="saldo" fill="rgba(120,160,255,0.88)" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "fechamento_loja" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <Panel title="Fechamento por loja">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={fechamentoPorLoja}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="loja" angle={-20} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip {...tooltipProps((v, name) => [name === "motos" ? v : formatBRL(v), name])} />
                  <Legend />
                  <Bar dataKey="faturamento" fill="rgba(120,160,255,0.88)" />
                  <Bar dataKey="liquido" fill="rgba(110,240,200,0.82)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Resumo por loja">
              <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 470, overflow: "auto" }}>
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
                    <div style={{ fontWeight: 800 }}>{item.loja}</div>
                    <div>Faturamento: <strong>{formatBRL(item.faturamento)}</strong></div>
                    <div>Líquido: <strong>{formatBRL(item.liquido)}</strong></div>
                    <div>Motos: <strong>{item.motos}</strong></div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "top_modelos" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Panel title="Top modelos">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={topModelos} layout="vertical">
                  <CartesianGrid {...THEME.grid} />
                  <XAxis type="number" {...THEME.axis} />
                  <YAxis type="category" dataKey="modelo" width={180} {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                  <Bar dataKey="total" fill="rgba(160,120,255,0.88)" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Vendas por cidade">
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={vendasPorCidade} layout="vertical">
                  <CartesianGrid {...THEME.grid} />
                  <XAxis type="number" {...THEME.axis} />
                  <YAxis type="category" dataKey="cidade" width={180} {...THEME.axis} />
                  <Tooltip {...tooltipProps((v) => [v, "Vendas"])} />
                  <Bar dataKey="total" fill="rgba(110,240,200,0.82)" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Pagamento motos">
              <ResponsiveContainer width="100%" height={470}>
                <PieChart>
                  <Tooltip {...tooltipProps((v, name) => [v, name])} />
                  <Legend />
                  <Pie data={pagamentoMotos} dataKey="qtd" nameKey="forma" outerRadius={150} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "pecas" && (
          <Panel title="Top peças">
            <ResponsiveContainer width="100%" height={470}>
              <BarChart data={topPecas} layout="vertical">
                <CartesianGrid {...THEME.grid} />
                <XAxis type="number" {...THEME.axis} />
                <YAxis type="category" dataKey="peca" width={260} {...THEME.axis} />
                <Tooltip {...tooltipProps((v) => [v, "Qtd"])} />
                <Bar dataKey="qtd" fill="rgba(255,190,90,0.88)" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "resumo_final" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(resumoFinal.faturamentoMotos)} />
            <KpiCard title="Faturamento peças" value={formatBRL(resumoFinal.faturamentoPecas)} />
            <KpiCard title="Faturamento geral" value={formatBRL(resumoFinal.faturamentoGeral)} />
            <KpiCard title="Líquido motos" value={formatBRL(resumoFinal.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={resumoFinal.totalMotos} />
            <KpiCard title="Vendas de peças" value={resumoFinal.totalPecas} />
          </div>
        )}
      </div>

      <style>{`
        .tv-corp .tv-btn{
          height: 38px;
          min-width: 46px;
          border-radius: 12px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.92);
          cursor: pointer;
        }
        .tv-corp .tv-btn:hover{ background: rgba(255,255,255,0.10); }

        .tv-corp .tv-select, .tv-corp .tv-input{
          height: 38px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.90);
          padding: 0 12px;
          outline: none;
        }

        .tv-corp .tv-chip{
          height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.90);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div
      style={{
        background: THEME.card,
        border: THEME.border,
        borderRadius: 18,
        padding: 16,
        boxShadow: THEME.shadow,
        minHeight: 100,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.75 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div
      style={{
        height: "100%",
        background: THEME.card,
        border: THEME.border,
        borderRadius: 20,
        padding: 16,
        boxShadow: THEME.shadow,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ height: "calc(100% - 30px)" }}>{children}</div>
    </div>
  );
}