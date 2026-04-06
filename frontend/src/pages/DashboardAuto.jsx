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

const getEmpresa = (v) =>
  v.santander === true || v.santander === "SIM" ? "EMENEZES" : "MOTONOW";

const getValorARepassar = (v) => {
  const repasse = toNumber(v.repasse);
  if (!repasse) return 0;
  return toNumber(v.valor) - repasse;
};

const calcLiquido = (v) => {
  return (
    toNumber(v.valor) -
    toNumber(v.valor_compra) -
    (v.brinde ? 100 : 0) -
    toNumber(v.gasolina) -
    toNumber(v.comissao_valor) -
    getValorARepassar(v)
  );
};

/* ================= COMPONENT ================= */
export default function DashboardAuto() {
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendas(res.data || []));
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    return {
      faturamento: vendas.reduce((a, v) => a + toNumber(v.valor), 0),
      liquido: vendas.reduce((a, v) => a + calcLiquido(v), 0),
      motos: vendas.length,
      comissao: vendas.reduce((a, v) => a + toNumber(v.comissao_valor), 0),
    };
  }, [vendas]);

  /* ================= FATURAMENTO DIA ================= */
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

  /* ================= CIDADE ================= */
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

  /* ================= LOJA ================= */
  const porLoja = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const loja = v.filial_venda || "N/I";

      if (!map.has(loja)) {
        map.set(loja, {
          loja,
          faturamento: 0,
          liquido: 0,
          motos: 0,
          comissao: 0,
        });
      }

      const cur = map.get(loja);

      cur.faturamento += toNumber(v.valor);
      cur.liquido += calcLiquido(v);
      cur.motos += 1;
      cur.comissao += toNumber(v.comissao_valor);

      map.set(loja, cur);
    });

    return Array.from(map.values());
  }, [vendas]);

  const fechamentoGeral = useMemo(() => {
    return {
      faturamento: porLoja.reduce((a, v) => a + v.faturamento, 0),
      liquido: porLoja.reduce((a, v) => a + v.liquido, 0),
      motos: porLoja.reduce((a, v) => a + v.motos, 0),
      comissao: porLoja.reduce((a, v) => a + v.comissao, 0),
    };
  }, [porLoja]);

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

      {/* FATURAMENTO DIA */}
      <Chart title="Faturamento por dia">
        <BarChart data={faturamentoDia}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="dia" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#00C49F" />
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

      {/* LOJA */}
      <h3>Fechamento por loja</h3>
      {porLoja.map((l) => (
        <div key={l.loja}>
          {l.loja} - {formatBRL(l.faturamento)} - {formatBRL(l.liquido)}
        </div>
      ))}

      {/* GERAL */}
      <h3>Fechamento geral</h3>
      <div>{formatBRL(fechamentoGeral.faturamento)}</div>
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