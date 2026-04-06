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
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendas(res.data || []));
    api.get("/motos").then((res) => setMotos(res.data || []));
  }, []);

  /* ================= SLIDES ================= */
  const slides = [
    "kpis",
    "faturamento",
    "estoque",
    "lojas",
    "modelos",
    "cidade",
    "ultimos7",
  ];

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

  /* ================= FATURAMENTO ================= */
  const faturamentoDia = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const d = isoDate(v.data_venda || v.created_at);
      if (!map.has(d)) map.set(d, { dia: d, total: 0 });
      map.get(d).total += toNumber(v.valor);
    });

    return Array.from(map.values());
  }, [vendas]);

  /* ================= ESTOQUE ================= */
  const estoquePorDia = useMemo(() => {
    const vendasMap = new Map();

    vendas.forEach((v) => {
      const d = isoDate(v.data_venda || v.created_at);
      vendasMap.set(d, (vendasMap.get(d) || 0) + 1);
    });

    const dias = Array.from(vendasMap.keys()).sort();
    let estoqueAtual = motos.filter((m) => m.status === "DISPONIVEL").length;

    const resultado = [];

    for (let i = dias.length - 1; i >= 0; i--) {
      const dia = dias[i];
      const vendasDia = vendasMap.get(dia);

      const final = estoqueAtual;
      const inicial = final + vendasDia;

      resultado.unshift({ dia, inicial, final });

      estoqueAtual = inicial;
    }

    return resultado;
  }, [vendas, motos]);

  /* ================= LOJAS ================= */
  const porLoja = useMemo(() => {
    const map = new Map();

    vendas.forEach((v) => {
      const loja = v.filial_venda || "N/I";

      if (!map.has(loja)) {
        map.set(loja, {
          loja,
          faturamento: 0,
          liquido: 0,
        });
      }

      const cur = map.get(loja);

      cur.faturamento += toNumber(v.valor);
      cur.liquido +=
        toNumber(v.valor) -
        toNumber(v.valor_compra) -
        toNumber(v.comissao_valor);

      map.set(loja, cur);
    });

    return Array.from(map.values());
  }, [vendas]);

  /* ================= MODELOS ================= */
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

  /* ================= 7 DIAS ================= */
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

  /* ================= UI ================= */
  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Dashboard Motos</h2>

      <button onClick={() => setSlide((s) => (s + 1) % slides.length)}>
        Próximo
      </button>

      {/* ================= SLIDES ================= */}

      {slides[slide] === "kpis" && (
        <div>
          <h3>Resumo</h3>
          <p>Faturamento: {formatBRL(kpis.faturamento)}</p>
          <p>Líquido: {formatBRL(kpis.liquido)}</p>
          <p>Motos: {kpis.motos}</p>
          <p>Comissões: {formatBRL(kpis.comissao)}</p>
        </div>
      )}

      {slides[slide] === "faturamento" && (
        <Chart title="Faturamento por dia">
          <BarChart data={faturamentoDia}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#00C49F" />
          </BarChart>
        </Chart>
      )}

      {slides[slide] === "estoque" && (
        <Chart title="Estoque por dia">
          <LineChart data={estoquePorDia}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Line dataKey="inicial" stroke="#8884d8" />
            <Line dataKey="final" stroke="#00C49F" />
          </LineChart>
        </Chart>
      )}

      {slides[slide] === "lojas" && (
        <div>
          <h3>Fechamento por loja</h3>
          {porLoja.map((l) => (
            <p key={l.loja}>
              {l.loja} - {formatBRL(l.faturamento)} - {formatBRL(l.liquido)}
            </p>
          ))}
        </div>
      )}

      {slides[slide] === "modelos" && (
        <Chart title="Top modelos">
          <BarChart data={topModelos} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="modelo" type="category" />
            <Tooltip />
            <Bar dataKey="total" fill="#8884d8" />
          </BarChart>
        </Chart>
      )}

      {slides[slide] === "cidade" && (
        <Chart title="Vendas por cidade">
          <BarChart data={porCidade}>
            <XAxis dataKey="cidade" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#82ca9d" />
          </BarChart>
        </Chart>
      )}

      {slides[slide] === "ultimos7" && (
        <Chart title="Últimos 7 dias">
          <LineChart data={ultimos7}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Line dataKey="vendas" stroke="#8884d8" />
          </LineChart>
        </Chart>
      )}
    </div>
  );
}

/* ================= COMPONENTES ================= */
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