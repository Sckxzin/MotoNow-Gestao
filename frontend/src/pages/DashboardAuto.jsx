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
const toNumber = (v) => Number(v) || 0;

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const isoDateOnly = (d) => {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
};

/* ================= LÓGICA ================= */
function getValorARepassar(v) {
  const repasse = toNumber(v.repasse);
  if (!repasse || repasse <= 0) return 0;
  return toNumber(v.valor) - repasse;
}

function calcLiquidoMoto(v) {
  return (
    toNumber(v.valor) -
    toNumber(v.valor_compra) -
    toNumber(v.gasolina) -
    toNumber(v.comissao_valor) -
    (v.brinde ? 100 : 0) -
    getValorARepassar(v)
  );
}

/* ================= COMPONENT ================= */
export default function DashboardAuto() {
  const nav = useNavigate();

  const [vendasMotos, setVendasMotos] = useState([]);
  const [motos, setMotos] = useState([]);

  const [slide, setSlide] = useState(0);

  const slides = [
    { id: "kpis", title: "Resumo" },
    { id: "motos_dia", title: "Vendas por dia" },
    { id: "estoque", title: "Estoque" },
  ];

  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendasMotos(res.data || []));
    api.get("/motos").then((res) => setMotos(res.data || []));
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    return {
      faturamento: vendasMotos.reduce((a, v) => a + toNumber(v.valor), 0),
      liquido: vendasMotos.reduce((a, v) => a + calcLiquidoMoto(v), 0),
      motos: vendasMotos.length,
      comissoes: vendasMotos.reduce((a, v) => a + toNumber(v.comissao_valor), 0),
    };
  }, [vendasMotos]);

  /* ================= VENDAS POR DIA ================= */
  const motosPorDia = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const d = isoDateOnly(v.created_at);
      if (!d) return;

      if (!map.has(d)) map.set(d, { dia: d, total: 0 });
      map.get(d).total += 1;
    });

    return Array.from(map.values());
  }, [vendasMotos]);

  /* ================= ESTOQUE REAL ================= */
  const estoquePorDia = useMemo(() => {
    if (!motos.length) return [];

    const vendasMap = new Map();

    vendasMotos.forEach((v) => {
      const dia = isoDateOnly(v.created_at);
      if (!dia) return;

      vendasMap.set(dia, (vendasMap.get(dia) || 0) + 1);
    });

    const dias = Array.from(vendasMap.keys()).sort();

    let estoqueAtual = motos.filter((m) => m.status === "DISPONIVEL").length;

    const resultado = [];

    for (let i = dias.length - 1; i >= 0; i--) {
      const dia = dias[i];
      const vendasDia = vendasMap.get(dia);

      const final = estoqueAtual;
      const inicial = final + vendasDia;

      resultado.unshift({
        dia,
        inicial,
        final,
      });

      estoqueAtual = inicial;
    }

    return resultado;
  }, [vendasMotos, motos]);

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Dashboard Motos</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setSlide((s) => (s - 1 + slides.length) % slides.length)}>◀</button>
        <button onClick={() => setSlide((s) => (s + 1) % slides.length)}>▶</button>
      </div>

      {/* ================= KPIS ================= */}
      {slides[slide].id === "kpis" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          <Card title="Faturamento" value={formatBRL(kpis.faturamento)} />
          <Card title="Líquido" value={formatBRL(kpis.liquido)} />
          <Card title="Motos" value={kpis.motos} />
          <Card title="Comissões" value={formatBRL(kpis.comissoes)} />
        </div>
      )}

      {/* ================= VENDAS ================= */}
      {slides[slide].id === "motos_dia" && (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={motosPorDia}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* ================= ESTOQUE ================= */}
      {slides[slide].id === "estoque" && (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={estoquePorDia}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Line dataKey="inicial" stroke="#8884d8" />
            <Line dataKey="final" stroke="#00C49F" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ================= COMPONENTES ================= */
function Card({ title, value }) {
  return (
    <div style={{ background: "#111", padding: 15, borderRadius: 10, color: "#fff" }}>
      <div>{title}</div>
      <strong>{value}</strong>
    </div>
  );
}