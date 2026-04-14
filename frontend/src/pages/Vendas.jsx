import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./VendasMotos.css";
import "./Vendas.css";

const CIDADES = [
  "ESCADA","IPOJUCA","RIBEIRAO","SAO JOSE","CATENDE","XEXEU","MARAGOGI","IPOJUCA RICARDO","CHA GRANDE",
];

export default function Vendas() {
  const nav = useNavigate();

  const [vendas, setVendas] = useState([]);
  const [aberta, setAberta] = useState(null);

  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [modalEditar, setModalEditar] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [vendaEditando, setVendaEditando] = useState(null);

  const [formEdicao, setFormEdicao] = useState({
    cliente_nome: "",
    cidade: "",
    forma_pagamento: "",
    observacao: "",
    total: "",
    rp: false,
    rr: false,
  });

  useEffect(() => {
    api.get("/vendas").then((res) => setVendas(res.data || []));
  }, []);

  function formatarValor(valor) {
    if (!valor) return "-";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function abrirModalEdicao(v) {
    setVendaEditando(v);
    setFormEdicao({
      cliente_nome: v.cliente_nome || "",
      cidade: v.cidade || "",
      forma_pagamento: v.forma_pagamento || "",
      observacao: v.observacao || "",
      total: v.total != null ? String(v.total) : "",
      rp: !!v.rp,
      rr: !!v.rr,
    });
    setModalEditar(true);
  }

  function fecharModalEdicao() {
    setModalEditar(false);
    setVendaEditando(null);
  }

  function alterarCampoEdicao(e) {
    const { name, value, type, checked } = e.target;
    setFormEdicao((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function salvarEdicao() {
    try {
      setSalvandoEdicao(true);

      const res = await api.put(`/vendas/${vendaEditando.id}`, {
        ...formEdicao,
        total: Number(formEdicao.total || 0),
      });

      const vendaAtualizada = res.data;

      setVendas((prev) =>
        prev.map((v) =>
          v.id === vendaEditando.id ? { ...v, ...vendaAtualizada } : v
        )
      );

      fecharModalEdicao();
      alert("Atualizado!");
    } catch (err) {
      alert("Erro ao salvar");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function toggleRP(v, val) {
    await api.put(`/vendas/${v.id}`, { ...v, rp: val });
    setVendas((prev) =>
      prev.map((x) => (x.id === v.id ? { ...x, rp: val } : x))
    );
  }

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const data = new Date(v.created_at);
      return (
        (cidadeFiltro === "TODAS" || v.cidade === cidadeFiltro) &&
        (!dataInicio || data >= new Date(dataInicio)) &&
        (!dataFim || data <= new Date(dataFim + "T23:59:59"))
      );
    });
  }, [vendas, cidadeFiltro, dataInicio, dataFim]);

  return (
    <div className="vendas-motos-container">
      <h2 className="vm-title">🧾 Histórico de Vendas</h2>

      <div className="vm-card">
        <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)}>
          <option value="TODAS">Todas</option>
          {CIDADES.map((c) => <option key={c}>{c}</option>)}
        </select>

        <input type="date" value={dataInicio} onChange={(e)=>setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={(e)=>setDataFim(e.target.value)} />
      </div>

      <div className="table-container vm-table-card">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Cidade</th>
              <th>RP</th>
              <th>RR</th>
              <th>Editar</th>
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{new Date(v.created_at).toLocaleDateString()}</td>
                <td>{v.cliente_nome}</td>
                <td>{formatarValor(v.total)}</td>
                <td>{v.cidade}</td>

                <td>
                  <input
                    type="checkbox"
                    checked={!!v.rp}
                    onChange={(e)=>toggleRP(v,e.target.checked)}
                  />
                </td>

                <td>
                  <input type="checkbox" checked={!!v.rr} readOnly />
                </td>

                <td>
                  <button onClick={()=>abrirModalEdicao(v)}>✏️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalEditar && (
        <div className="modal">
          <h3>Editar</h3>

          <input name="cliente_nome" value={formEdicao.cliente_nome} onChange={alterarCampoEdicao} />
          <input name="total" value={formEdicao.total} onChange={alterarCampoEdicao} />

          <label>
            <input type="checkbox" name="rp" checked={formEdicao.rp} onChange={alterarCampoEdicao} />
            RP
          </label>

          <label>
            <input type="checkbox" name="rr" checked={formEdicao.rr} onChange={alterarCampoEdicao} />
            RR
          </label>

          <button onClick={salvarEdicao}>Salvar</button>
          <button onClick={fecharModalEdicao}>Cancelar</button>
        </div>
      )}
    </div>
  );
}