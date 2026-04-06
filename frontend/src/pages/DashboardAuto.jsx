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
  return x.toISOString().slice(0, 10);
}

function formatDateBRFromISO(iso) {
  const x = safeDate(iso);
  if (!x) return "";
  return x.toLocaleDateString("pt-BR");
}

/* ================= CÁLCULO ================= */
function getValorARepassar(v) {
  const repasse = Number(v.repasse || 0);
  if (!repasse) return 0;
  return Number(v.valor || 0) - repasse;
}

function calcLiquidoMoto(v) {
  const valorVenda = Number(v.valor || 0);
  const valorCompra = Number(v.valor_compra || 0);
  const gasolina = Number(v.gasolina || 0);
  const comissao = Number(v.comissao_valor || 0);
  const brinde = v.brinde ? 100 : 0;
  const aRepassar = getValorARepassar(v);

  return valorVenda - valorCompra - brinde - gasolina - comissao - aRepassar;
}

export default function DashboardAuto() {
  const nav = useNavigate();

  const [vendasMotos, setVendasMotos] = useState([]);
  const [slide, setSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const timerRef = useRef(null);

  const slides = [
    { id: "kpis" },
    { id: "fat_dia" },
    { id: "estoque" },
    { id: "lojas" },
    { id: "modelos" },
    { id: "resumo" },
  ];

  useEffect(() => {
    api.get("/vendas-motos")
      .then((res) => setVendasMotos(res.data || []))
      .catch(() => setVendasMotos([]));
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    const faturamento = vendasMotos.reduce((a, v) => a + toNumber(v.valor), 0);
    const liquido = vendasMotos.reduce((a, v) => a + calcLiquidoMoto(v), 0);
    const qtd = vendasMotos.length;
    const comissoes = vendasMotos.reduce((a, v) => a + toNumber(v.comissao_valor), 0);

    return { faturamento, liquido, qtd, comissoes };
  }, [vendasMotos]);

  /* ================= POR DIA ================= */
  const porDia = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const dia = isoDateOnly(v.data_venda || v.created_at);
      if (!dia) return;
      map.set(dia, (map.get(dia) || 0) + toNumber(v.valor));
    });

    return Array.from(map.entries()).map(([dia, total]) => ({
      dia: formatDateBRFromISO(dia),
      total,
    }));
  }, [vendasMotos]);

  /* ================= ESTOQUE ================= */
  const estoque = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const entrada = isoDateOnly(v.created_at);
      const saida = isoDateOnly(v.data_venda);

      if (entrada) map.set(entrada, (map.get(entrada) || 0) + 1);
      if (saida) map.set(saida, (map.get(saida) || 0) - 1);
    });

    let saldo = 0;

    return Array.from(map.entries()).map(([dia, val]) => {
      saldo += val;
      return { dia: formatDateBRFromISO(dia), saldo };
    });
  }, [vendasMotos]);

  /* ================= LOJAS ================= */
  const lojas = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const loja = v.filial_venda || "N/I";

      if (!map.has(loja)) {
        map.set(loja, { loja, faturamento: 0, liquido: 0, motos: 0 });
      }

      const cur = map.get(loja);
      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquidoMoto(v);
      cur.motos += 1;
    });

    return Array.from(map.values());
  }, [vendasMotos]);

  /* ================= MODELOS ================= */
  const modelos = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const m = v.modelo || "N/I";
      map.set(m, (map.get(m) || 0) + 1);
    });

    return Array.from(map.entries()).map(([modelo, total]) => ({ modelo, total }));
  }, [vendasMotos]);

  /* ================= AUTO SLIDE ================= */
  useEffect(() => {
    if (!autoPlay) return;
    timerRef.current = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timerRef.current);
  }, [autoPlay]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0f18", color: "#fff" }}>

      {/* HEADER */}
      <div style={{ padding: 20, display: "flex", justifyContent: "space-between" }}>
        <h2>Dashboard MotoNow</h2>
        <button onClick={() => nav("/home")}>Voltar</button>
      </div>

      {/* SLIDES */}
      <div style={{ padding: 20, height: "calc(100% - 80px)" }}>

        {/* KPIS */}
        {slides[slide].id === "kpis" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            <Kpi title="Faturamento" value={formatBRL(kpis.faturamento)} />
            <Kpi title="Líquido" value={formatBRL(kpis.liquido)} />
            <Kpi title="Motos" value={kpis.qtd} />
            <Kpi title="Comissões" value={formatBRL(kpis.comissoes)} />
          </div>
        )}

        {/* FATURAMENTO */}
        {slides[slide].id === "fat_dia" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={porDia}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* ESTOQUE */}
        {slides[slide].id === "estoque" && (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={estoque}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Line dataKey="saldo" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* LOJAS */}
        {slides[slide].id === "lojas" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={lojas}>
              <XAxis dataKey="loja" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="faturamento" />
              <Bar dataKey="liquido" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* MODELOS */}
        {slides[slide].id === "modelos" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={modelos}>
              <XAxis dataKey="modelo" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* RESUMO */}
        {slides[slide].id === "resumo" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            <Kpi title="Faturamento" value={formatBRL(kpis.faturamento)} />
            <Kpi title="Líquido" value={formatBRL(kpis.liquido)} />
            <Kpi title="Motos" value={kpis.qtd} />
          </div>
        )}

      </div>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div style={{ background: "#111", padding: 20, borderRadius: 12 }}>
      <div>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}