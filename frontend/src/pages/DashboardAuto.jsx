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
  Legend,
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
  const nav = useNavigate();

  const [vendasMotos, setVendasMotos] = useState([]);
  const [motos, setMotos] = useState([]);

  // 🔥 FINANCEIRO
  const [saldo, setSaldo] = useState(0);
  const [aReceber, setAReceber] = useState(0);
  const [estoqueCompra, setEstoqueCompra] = useState(0);
  const [estoqueVenda, setEstoqueVenda] = useState(0);
  const [shineray, setShineray] = useState(0);
  const [eduardo, setEduardo] = useState(0);
  const [fornecedor, setFornecedor] = useState(0);

  const slides = [
    { id: "kpis", title: "Resumo" },
    { id: "fat_dia", title: "Faturamento por dia" },
    { id: "ultimos_7", title: "Últimos 7 dias" },
    { id: "financeiro_inputs", title: "Controle financeiro" },
    { id: "financeiro_resultado", title: "Resultado financeiro" },
  ];

  const [slide, setSlide] = useState(0);

  useEffect(() => {
    api.get("/vendas-motos").then((res) => setVendasMotos(res.data || []));
    api.get("/motos").then((res) => setMotos(res.data || []));
  }, []);

  useEffect(() => {
    api.get("/estoque-motos-resumo").then((res) => {
      setEstoqueCompra(res.data.totalCompra);
      setEstoqueVenda(res.data.totalVenda);
    });
  }, []);

  /* ================= KPIS ================= */
  const kpis = useMemo(() => {
    return {
      faturamento: vendasMotos.reduce((a, v) => a + toNumber(v.valor), 0),
      motos: vendasMotos.length,
      comissoes: vendasMotos.reduce((a, v) => a + toNumber(v.comissao_valor), 0),
    };
  }, [vendasMotos]);

  /* ================= FATURAMENTO DIA ================= */
  const faturamentoDia = useMemo(() => {
    const map = new Map();

    vendasMotos.forEach((v) => {
      const d = isoDate(v.data_venda || v.created_at);
      if (!map.has(d)) map.set(d, { dia: d, total: 0 });
      map.get(d).total += toNumber(v.valor);
    });

    return Array.from(map.values());
  }, [vendasMotos]);

  /* ================= ÚLTIMOS 7 ================= */
  const ultimos7 = useMemo(() => {
    const hoje = new Date();
    const arr = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(hoje.getDate() - i);

      const iso = d.toISOString().slice(0, 10);

      const qtd = vendasMotos.filter(
        (v) => isoDate(v.data_venda || v.created_at) === iso
      ).length;

      arr.push({
        dia: d.toLocaleDateString("pt-BR"),
        vendas: qtd,
      });
    }

    return arr;
  }, [vendasMotos]);

  /* ================= FINANCEIRO ================= */

  const jotaCompra =
    Number(saldo) +
    Number(aReceber) +
    Number(estoqueCompra) -
    Number(shineray) -
    Number(eduardo) -
    Number(fornecedor);

  const jotaVenda =
    Number(saldo) +
    Number(aReceber) +
    Number(estoqueVenda) -
    Number(shineray) -
    Number(eduardo) -
    Number(fornecedor);

  /* ================= UI ================= */

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>Dashboard MotoNow</h2>

      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setSlide((s) => (s + 1) % slides.length)}>
          Próximo Slide
        </button>
      </div>

      {/* KPIS */}
      {slides[slide].id === "kpis" && (
        <div style={{ display: "flex", gap: 20 }}>
          <Card title="Faturamento" value={formatBRL(kpis.faturamento)} />
          <Card title="Motos" value={kpis.motos} />
          <Card title="Comissões" value={formatBRL(kpis.comissoes)} />
        </div>
      )}

      {/* FATURAMENTO DIA */}
      {slides[slide].id === "fat_dia" && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={faturamentoDia}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* ÚLTIMOS 7 */}
      {slides[slide].id === "ultimos_7" && (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={ultimos7}>
            <XAxis dataKey="dia" />
            <YAxis />
            <Tooltip />
            <Line dataKey="vendas" stroke="#8884d8" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* INPUT FINANCEIRO */}
      {slides[slide].id === "financeiro_inputs" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <Input label="Saldo" value={saldo} setValue={setSaldo} />
          <Input label="A Receber" value={aReceber} setValue={setAReceber} />
          <Input label="Shineray" value={shineray} setValue={setShineray} />
          <Input label="Eduardo" value={eduardo} setValue={setEduardo} />
          <Input label="Fornecedor" value={fornecedor} setValue={setFornecedor} />

          <Stat label="Estoque Compra" value={formatBRL(estoqueCompra)} />
          <Stat label="Estoque Venda" value={formatBRL(estoqueVenda)} />
        </div>
      )}

      {/* RESULTADO */}
      {slides[slide].id === "financeiro_resultado" && (
        <div style={{ display: "flex", gap: 20 }}>
          <BigStat label="JOTA COMPRA" value={formatBRL(jotaCompra)} />
          <BigStat label="JOTA VENDA" value={formatBRL(jotaVenda)} />
        </div>
      )}
    </div>
  );
}

/* ================= COMPONENTES ================= */

function Card({ title, value }) {
  return (
    <div style={{ background: "#111", padding: 20 }}>
      <div>{title}</div>
      <strong>{value}</strong>
    </div>
  );
}

function BigStat({ label, value }) {
  return (
    <div style={{ background: "#111", padding: 20 }}>
      <div>{label}</div>
      <h2>{value}</h2>
    </div>
  );
}

function Input({ label, value, setValue }) {
  return (
    <div>
      <label>{label}</label>
      <input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <label>{label}</label>
      <div>{value}</div>
    </div>
  );
}