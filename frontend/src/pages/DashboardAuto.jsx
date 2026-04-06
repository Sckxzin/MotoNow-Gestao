/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from "react";
import api from "../api";
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
const toNumber = (v) => Number(v) || 0;

const formatBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

/* ================= COMPONENT ================= */
export default function DashboardAuto() {
  const [vendas, setVendas] = useState([]);
  const [motos, setMotos] = useState([]);

  /* ================= LOAD ================= */
  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendas(res.data || []));
    api.get("/motos").then((res) => setMotos(res.data || []));
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    return {
      faturamento: vendas.reduce((a, v) => a + toNumber(v.valor), 0),
      liquido: vendas.reduce(
        (a, v) =>
          a +
          (toNumber(v.valor) -
            toNumber(v.valor_compra) -
            (v.brinde ? 100 : 0) -
            toNumber(v.gasolina) -
            toNumber(v.comissao_valor)),
        0
      ),
      motos: vendas.length,
      comissao: vendas.reduce((a, v) => a + toNumber(v.comissao_valor), 0),
    };
  }, [vendas]);

  /* ================= FATURAMENTO POR DIA ================= */
  const faturamentoDia = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const d = isoDate(v.data_venda || v.created_at);

      if (!map.has(d)) map.set(d, { dia: d, total: 0 });

      map.get(d).total += toNumber(v.valor);
    });

    return Array.from(map.values());
  }, [vendas]);

  /* ================= ÚLTIMOS 7 DIAS ================= */
  const ultimos7 = useMemo(() => {
    const hoje = new Date();
    const arr = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);

      const iso = d.toISOString().slice(0, 10);

      const qtd = vendas.filter(
        (v) => isoDate(v.data_venda || v.created_at) === iso
      ).length;

      arr.push({
        dia: d.toLocaleDateString("pt-BR"),
        vendas: qtd,
      });
    }

    return arr;
  }, [vendas]);

  /* ================= ESTOQUE REAL ================= */
  const estoquePorDia = useMemo(() => {
    const vendasMap = new Map();

    vendas.forEach((v) => {
      const d = isoDate(v.data_venda || v.created_at);

      if (!vendasMap.has(d)) vendasMap.set(d, 0);
      vendasMap.set(d, vendasMap.get(d) + 1);
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
        vendas: vendasDia,
        final,
      });

      estoqueAtual = inicial;
    }

    return resultado;
  }, [vendas, motos]);

  /* ================= ESTOQUE POR CIDADE ================= */
  const estoqueCidade = useMemo(() => {
    const map = new Map();

    motos.forEach((m) => {
      if (m.status !== "DISPONIVEL") return;

      const cidade = m.filial || "N/I";
      map.set(cidade, (map.get(cidade) || 0) + 1);
    });

    return Array.from(map.entries()).map(([cidade, total]) => ({
      cidade,
      total,
    }));
  }, [motos]);

  /* ================= TOP MODELOS ================= */
  const topModelos = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const m = v.modelo || "SEM";
      map.set(m, (map.get(m) || 0) + 1);
    });

    return Array.from(map.entries())
      .map(([modelo, total]) => ({ modelo, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [vendas]);

  /* ================= POR CIDADE ================= */
  const porCidade = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const c = v.filial_venda || "N/I";
      map.set(c, (map.get(c) || 0) + 1);
    });

    return Array.from(map.entries()).map(([cidade, total]) => ({
      cidade,
      total,
    }));
  }, [vendas]);

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>DASHBOARD MOTOS</h2>

      {/* KPIS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <Card title="Faturamento" value={formatBRL(kpis.faturamento)} />
        <Card title="Líquido" value={formatBRL(kpis.liquido)} />
        <Card title="Motos" value={kpis.motos} />
        <Card title="Comissões" value={formatBRL(kpis.comissao)} />
      </div>

      {/* FATURAMENTO */}
      <Chart title="Faturamento por dia">
        <BarChart data={faturamentoDia}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#00C49F" />
        </BarChart>
      </Chart>

      {/* ESTOQUE */}
      <Chart title="Estoque por dia">
        <LineChart data={estoquePorDia}>
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Line dataKey="inicial" stroke="#8884d8" name="Inicial" />
          <Line dataKey="final" stroke="#00C49F" name="Final" />
        </LineChart>
      </Chart>

      {/* ESTOQUE CIDADE */}
      <Chart title="Estoque por cidade">
        <BarChart data={estoqueCidade}>
          <XAxis dataKey="cidade" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#FFBB28" />
        </BarChart>
      </Chart>

      {/* ÚLTIMOS 7 */}
      <Chart title="Últimos 7 dias">
        <LineChart data={ultimos7}>
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Line dataKey="vendas" stroke="#8884d8" />
        </LineChart>
      </Chart>

      {/* TOP MODELOS */}
      <Chart title="Top modelos">
        <BarChart data={topModelos} layout="vertical">
          <XAxis type="number" />
          <YAxis dataKey="modelo" type="category" />
          <Tooltip />
          <Bar dataKey="total" fill="#8884d8" />
        </BarChart>
      </Chart>

      {/* CIDADE */}
      <Chart title="Vendas por cidade">
        <BarChart data={porCidade}>
          <XAxis dataKey="cidade" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#82ca9d" />
        </BarChart>
      </Chart>
    </div>
  );
}

/* ================= COMPONENTES ================= */
function Card({ title, value }) {
  return (
    <div style={{ background: "#111", padding: 15, borderRadius: 10 }}>
      <div>{title}</div>
      <strong>{value}</strong>
    </div>
  );
}

function Chart({ title, children }) {
  return (
    <div style={{ marginTop: 30 }}>
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}