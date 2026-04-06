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

function pickDateVenda(v) {
  return v.data_venda || v.created_at;
}

/* ================= LÓGICA LÍQUIDO ================= */
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
  const valorBrinde = v.brinde ? 100 : 0;
  const aRepassar = getValorARepassar(v) || 0;

  return valorVenda - valorCompra - valorBrinde - gasolina - comissao - aRepassar;
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
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");

  const slides = useMemo(
    () => [
      { id: "kpis", title: "Resumo executivo" },
      { id: "fat_dia", title: "Faturamento por dia" },
      { id: "estoque_motos", title: "Fluxo de estoque de motos" },
      { id: "fechamento_loja", title: "Fechamento por loja" },
      { id: "top_modelos", title: "Top modelos" },
      { id: "cidade", title: "Vendas por cidade" },
      { id: "resumo_final", title: "Resumo final" },
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

  /* ================= BASE FILTRADA ================= */
  const motosFiltradas = useMemo(() => {
    return (vendasMotos || [])
      .filter((v) => clampDateRange(pickDateVenda(v), dataInicio, dataFim))
      .filter((v) => {
        const emp = getEmpresa(v);
        return empresaFiltro === "TODAS" || emp === empresaFiltro;
      });
  }, [vendasMotos, dataInicio, dataFim, empresaFiltro]);

  function pickCityFromVendaMoto(v) {
    return v.filial_venda || v.filial_origem || v.cidade || v.filial || "N/I";
  }

  function pickLojaMoto(v) {
    return String(v.filial_venda || v.filial_origem || v.cidade || v.filial || "N/I")
      .trim()
      .toUpperCase();
  }

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = motosFiltradas.length;
    const ticketMedioMotos = qtdMotos > 0 ? faturamentoMotos / qtdMotos : 0;

    const totalComissao = motosFiltradas.reduce((acc, v) => acc + toNumber(v.comissao_valor), 0);
    const totalGasolina = motosFiltradas.reduce((acc, v) => acc + toNumber(v.gasolina), 0);
    const totalBrindes = motosFiltradas.reduce((acc, v) => acc + (v.brinde ? 100 : 0), 0);

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      ticketMedioMotos,
      totalComissao,
      totalGasolina,
      totalBrindes,
    };
  }, [motosFiltradas]);

  /* ================= FATURAMENTO POR DIA ================= */
  const faturamentoPorDia = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const key = isoDateOnly(pickDateVenda(v));
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          diaISO: key,
          dia: formatDateBRFromISO(key),
          total: 0,
          qtd: 0,
        });
      }

      const cur = map.get(key);
      cur.total += toNumber(v.valor);
      cur.qtd += 1;
      map.set(key, cur);
    });

    return Array.from(map.values())
      .map((x) => ({
        ...x,
        total: Math.round(x.total * 100) / 100,
      }))
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .slice(-45);
  }, [motosFiltradas]);

  /* ================= ESTOQUE / FLUXO POR DIA ================= */
  const estoqueMotosPorDia = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const key = isoDateOnly(pickDateVenda(v));
      if (!key) return;

      if (!map.has(key)) {
        map.set(key, {
          diaISO: key,
          dia: formatDateBRFromISO(key),
          saidas: 0,
          faturamento: 0,
          liquido: 0,
        });
      }

      const cur = map.get(key);
      cur.saidas += 1;
      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquidoMoto(v);
      map.set(key, cur);
    });

    let acumulado = 0;

    return Array.from(map.values())
      .sort((a, b) => a.diaISO.localeCompare(b.diaISO))
      .map((x) => {
        acumulado += x.saidas;
        return {
          ...x,
          faturamento: Math.round(x.faturamento * 100) / 100,
          liquido: Math.round(x.liquido * 100) / 100,
          acumulado,
        };
      })
      .slice(-45);
  }, [motosFiltradas]);

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

  /* ================= CIDADE ================= */
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

  /* ================= FECHAMENTO POR LOJA ================= */
  const fechamentoTitulo = useMemo(() => {
    if (dataInicio && dataFim) {
      if (dataInicio === dataFim) return formatDateBRFromISO(dataInicio);
      return `${formatDateBRFromISO(dataInicio)} até ${formatDateBRFromISO(dataFim)}`;
    }

    if (dataInicio) return `a partir de ${formatDateBRFromISO(dataInicio)}`;
    if (dataFim) return `até ${formatDateBRFromISO(dataFim)}`;

    return "Período geral";
  }, [dataInicio, dataFim]);

  const fechamentoPorLoja = useMemo(() => {
    const map = new Map();

    motosFiltradas.forEach((v) => {
      const loja = pickLojaMoto(v);

      if (!map.has(loja)) {
        map.set(loja, {
          loja,
          faturamento: 0,
          liquido: 0,
          motos: 0,
          comissao: 0,
          gasolina: 0,
          brindes: 0,
        });
      }

      const cur = map.get(loja);
      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquidoMoto(v);
      cur.motos += 1;
      cur.comissao += toNumber(v.comissao_valor);
      cur.gasolina += toNumber(v.gasolina);
      cur.brindes += v.brinde ? 100 : 0;
      map.set(loja, cur);
    });

    return Array.from(map.values())
      .map((x) => ({
        ...x,
        faturamento: Math.round(x.faturamento * 100) / 100,
        liquido: Math.round(x.liquido * 100) / 100,
        comissao: Math.round(x.comissao * 100) / 100,
        gasolina: Math.round(x.gasolina * 100) / 100,
        brindes: Math.round(x.brindes * 100) / 100,
      }))
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [motosFiltradas]);

  const fechamentoGeral = useMemo(() => {
    const faturamento = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.faturamento || 0), 0);
    const liquido = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.liquido || 0), 0);
    const motos = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.motos || 0), 0);
    const ticketMedio = motos > 0 ? faturamento / motos : 0;
    const lojasAtivas = fechamentoPorLoja.length;
    const comissao = fechamentoPorLoja.reduce((acc, item) => acc + Number(item.comissao || 0), 0);

    return {
      faturamento,
      liquido,
      motos,
      ticketMedio,
      lojasAtivas,
      comissao,
    };
  }, [fechamentoPorLoja]);

  /* ================= RESUMO FINAL ================= */
  const resumoFinal = useMemo(() => {
    const faturamentoMotos = motosFiltradas.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = motosFiltradas.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const totalMotos = motosFiltradas.length;
    const ticketMedioMotos = totalMotos > 0 ? faturamentoMotos / totalMotos : 0;
    const totalComissao = motosFiltradas.reduce((acc, v) => acc + toNumber(v.comissao_valor), 0);
    const totalGasolina = motosFiltradas.reduce((acc, v) => acc + toNumber(v.gasolina), 0);
    const totalBrindes = motosFiltradas.reduce((acc, v) => acc + (v.brinde ? 100 : 0), 0);

    return {
      faturamentoMotos,
      liquidoMotos,
      totalMotos,
      ticketMedioMotos,
      totalComissao,
      totalGasolina,
      totalBrindes,
    };
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
            <div style={{ opacity: 0.7, fontWeight: 600 }}>Dashboard • TV • Motos</div>
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
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Ticket médio motos" value={formatBRL(kpis.ticketMedioMotos)} />
            <KpiCard title="Comissões" value={formatBRL(kpis.totalComissao)} />
            <KpiCard title="Gasolina" value={formatBRL(kpis.totalGasolina)} />
            <KpiCard title="Brindes" value={formatBRL(kpis.totalBrindes)} />
            <KpiCard title="Lojas ativas" value={fechamentoGeral.lojasAtivas} />
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
                <Bar
                  dataKey="total"
                  radius={[10, 10, 0, 0]}
                  fill="rgba(110,240,200,0.82)"
                  stroke="rgba(255,255,255,0.06)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "estoque_motos" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
            <Panel title="Fluxo de estoque de motos por dia" rightHint="(saídas / vendas)">
              <ResponsiveContainer width="100%" height={470}>
                <LineChart data={estoqueMotosPorDia} margin={{ top: 18, right: 16, bottom: 44, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="dia" angle={-30} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis allowDecimals={false} {...THEME.axis} />
                  <Tooltip
                    {...tooltipProps((v, name) => {
                      if (name === "faturamento" || name === "liquido") return [formatBRL(v), name];
                      return [v, name];
                    })}
                  />
                  <Line type="monotone" dataKey="saidas" name="Saídas" stroke="rgba(110,240,200,0.92)" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="rgba(120,160,255,0.92)" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Resumo do fluxo" rightHint="(período filtrado)">
              <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                <BigStat label="Saídas totais" value={kpis.qtdMotos} />
                <BigStat label="Faturamento" value={formatBRL(kpis.faturamentoMotos)} />
                <BigStat label="Líquido" value={formatBRL(kpis.liquidoMotos)} />
                <BigStat label="Ticket médio" value={formatBRL(kpis.ticketMedioMotos)} />
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
            <Panel title="Fechamento por loja" rightHint={`Período: ${fechamentoTitulo}`}>
              <ResponsiveContainer width="100%" height={470}>
                <BarChart data={fechamentoPorLoja} margin={{ top: 18, right: 16, bottom: 40, left: 8 }}>
                  <CartesianGrid {...THEME.grid} />
                  <XAxis dataKey="loja" angle={-20} textAnchor="end" height={60} {...THEME.axis} />
                  <YAxis {...THEME.axis} />
                  <Tooltip
                    {...tooltipProps((v, name) => {
                      if (name === "faturamento" || name === "liquido") return [formatBRL(v), name];
                      return [v, name];
                    })}
                  />
                  <Bar dataKey="faturamento" name="Faturamento" radius={[10, 10, 0, 0]} fill="rgba(120,160,255,0.88)" />
                  <Bar dataKey="liquido" name="Líquido" radius={[10, 10, 0, 0]} fill="rgba(110,240,200,0.82)" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Resumo por loja" rightHint={`Período: ${fechamentoTitulo}`}>
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
                    <div style={{ fontSize: 12, opacity: 0.72, marginTop: 4 }}>
                      Motos: {item.motos}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14 }}>
                      Faturamento: <strong>{formatBRL(item.faturamento)}</strong>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14 }}>
                      Líquido: <strong>{formatBRL(item.liquido)}</strong>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 14 }}>
                      Comissão: <strong>{formatBRL(item.comissao)}</strong>
                    </div>
                  </div>
                ))}

                {fechamentoPorLoja.length === 0 && (
                  <div style={{ opacity: 0.7, fontSize: 14 }}>
                    Nenhum dado encontrado nesse período.
                  </div>
                )}
              </div>
            </Panel>

            <Panel title="Fechamento geral" rightHint={`Período: ${fechamentoTitulo}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
                <BigStat label="Faturamento geral" value={formatBRL(fechamentoGeral.faturamento)} />
                <BigStat label="Líquido geral" value={formatBRL(fechamentoGeral.liquido)} />
                <BigStat label="Motos vendidas" value={fechamentoGeral.motos} />
                <BigStat label="Ticket médio" value={formatBRL(fechamentoGeral.ticketMedio)} />
                <BigStat label="Comissões" value={formatBRL(fechamentoGeral.comissao)} />
                <BigStat label="Lojas ativas" value={fechamentoGeral.lojasAtivas} />
              </div>
            </Panel>
          </div>
        )}

        {slides[slide]?.id === "top_modelos" && (
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
                <Bar
                  dataKey="total"
                  radius={[0, 10, 10, 0]}
                  fill="rgba(160,120,255,0.88)"
                  stroke="rgba(255,255,255,0.06)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

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
                <Bar
                  dataKey="total"
                  radius={[0, 10, 10, 0]}
                  fill="rgba(110,240,200,0.82)"
                  stroke="rgba(255,255,255,0.06)"
                />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        )}

        {slides[slide]?.id === "resumo_final" && (
          <div style={{ height: "100%", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(resumoFinal.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(resumoFinal.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={resumoFinal.totalMotos} />
            <KpiCard title="Ticket médio motos" value={formatBRL(resumoFinal.ticketMedioMotos)} />
            <KpiCard title="Comissões" value={formatBRL(resumoFinal.totalComissao)} />
            <KpiCard title="Gasolina" value={formatBRL(resumoFinal.totalGasolina)} />
            <KpiCard title="Brindes" value={formatBRL(resumoFinal.totalBrindes)} />
            <KpiCard title="Lojas ativas" value={fechamentoGeral.lojasAtivas} />
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