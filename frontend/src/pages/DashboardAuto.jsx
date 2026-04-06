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

/* ================= CÁLCULOS ================= */
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
    { id: "kpis", title: "Resumo executivo" },
    { id: "fat_dia", title: "Faturamento por dia" },
    { id: "estoque_motos", title: "Fluxo de estoque de motos" },
    { id: "fechamento_loja", title: "Fechamento por loja" },
    { id: "top_modelos", title: "Modelos e cidades" },
    { id: "resumo_final", title: "Resumo final" },
  ];

  useEffect(() => {
    api.get("/vendas-motos")
      .then((res) => setVendasMotos(res.data || []))
      .catch(() => setVendasMotos([]));
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    const faturamentoMotos = vendasMotos.reduce((acc, v) => acc + toNumber(v.valor), 0);
    const liquidoMotos = vendasMotos.reduce((acc, v) => acc + calcLiquidoMoto(v), 0);
    const qtdMotos = vendasMotos.length;
    const totalComissoes = vendasMotos.reduce((acc, v) => acc + toNumber(v.comissao_valor), 0);

    return {
      faturamentoMotos,
      liquidoMotos,
      qtdMotos,
      totalComissoes,
    };
  }, [vendasMotos]);

  /* ================= FATURAMENTO POR DIA ================= */
  const motosPorDia = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const key = isoDateOnly(v.data_venda || v.created_at);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + toNumber(v.valor));
    });

    return Array.from(map.entries()).map(([dia, total]) => ({
      dia: formatDateBRFromISO(dia),
      total,
    }));
  }, [vendasMotos]);

  /* ================= ESTOQUE ================= */
  const fluxoEstoqueMotos = useMemo(() => {
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
  const fechamentoPorLoja = useMemo(() => {
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
  const topModelos = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const key = v.modelo || "SEM MODELO";
      map.set(key, (map.get(key) || 0) + 1);
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
    <div className="dash-auto tv-corp">

      {/* HEADER */}
      <div style={{ padding: 20, display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2>Dashboard MotoNow</h2>
          <span>{slides[slide].title}</span>
        </div>
        <button onClick={() => nav("/home")}>⬅</button>
      </div>

      {/* SLIDES */}
      <div style={{ padding: 20, height: "calc(100% - 80px)" }}>

        {/* KPIS */}
        {slides[slide].id === "kpis" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
            <KpiCard title="Comissões" value={formatBRL(kpis.totalComissoes)} />
          </div>
        )}

        {/* FATURAMENTO */}
        {slides[slide].id === "fat_dia" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={motosPorDia}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* ESTOQUE */}
        {slides[slide].id === "estoque_motos" && (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart data={fluxoEstoqueMotos}>
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Line dataKey="saldo" />
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* LOJAS */}
        {slides[slide].id === "fechamento_loja" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={fechamentoPorLoja}>
              <XAxis dataKey="loja" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="faturamento" />
              <Bar dataKey="liquido" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* MODELOS */}
        {slides[slide].id === "top_modelos" && (
          <ResponsiveContainer width="100%" height={500}>
            <BarChart data={topModelos}>
              <XAxis dataKey="modelo" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* RESUMO */}
        {slides[slide].id === "resumo_final" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            <KpiCard title="Faturamento motos" value={formatBRL(kpis.faturamentoMotos)} />
            <KpiCard title="Líquido motos" value={formatBRL(kpis.liquidoMotos)} />
            <KpiCard title="Motos vendidas" value={kpis.qtdMotos} />
          </div>
        )}

      </div>
    </div>
  );
}

function KpiCard({ title, value }) {
  return (
    <div style={{ background: "#111", padding: 20, borderRadius: 12 }}>
      <div>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold" }}>{value}</div>
    </div>
  );
}