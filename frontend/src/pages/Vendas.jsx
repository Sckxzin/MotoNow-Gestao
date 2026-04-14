import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./VendasMotos.css";
import "./Vendas.css";

const CIDADES = [
  "ESCADA",
  "IPOJUCA",
  "RIBEIRAO",
  "SAO JOSE",
  "CATENDE",
  "XEXEU",
  "MARAGOGI",
  "IPOJUCA RICARDO",
  "CHA GRANDE",
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
    rr: false, // ✅ NOVO
  });

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    try {
      const res = await api.get("/vendas");
      setVendas(res.data || []);
    } catch (error) {
      console.error("Erro ao carregar vendas:", error);
      setVendas([]);
    }
  }

  function formatarValor(valor) {
    if (valor == null || valor === "" || Number.isNaN(Number(valor))) {
      return "-";
    }

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
      rr: !!v.rr, // ✅ NOVO
    });
    setModalEditar(true);
  }

  function fecharModalEdicao() {
    setModalEditar(false);
    setVendaEditando(null);
    setFormEdicao({
      cliente_nome: "",
      cidade: "",
      forma_pagamento: "",
      observacao: "",
      total: "",
      rp: false,
      rr: false, // ✅ NOVO
    });
  }

  function alterarCampoEdicao(e) {
    const { name, value, type, checked } = e.target;

    setFormEdicao((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function salvarEdicao() {
    if (!vendaEditando) return;

    try {
      setSalvandoEdicao(true);

      const payload = {
        cliente_nome: formEdicao.cliente_nome?.trim() || null,
        cidade: formEdicao.cidade || null,
        forma_pagamento: formEdicao.forma_pagamento?.trim() || null,
        observacao: formEdicao.observacao?.trim() || null,
        total: formEdicao.total !== "" ? Number(formEdicao.total) : 0,
        rp: !!formEdicao.rp,
        rr: !!formEdicao.rr, // ✅ NOVO
      };

      const res = await api.put(`/vendas/${vendaEditando.id}`, payload);
      const vendaAtualizada = res.data;

      setVendas((prev) =>
        prev.map((v) =>
          v.id === vendaEditando.id ? { ...v, ...vendaAtualizada } : v
        )
      );

      fecharModalEdicao();
      alert("Venda atualizada com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar venda:", error);
      alert("Erro ao atualizar a venda.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  async function toggleRP(venda, novoValor) {
    try {
      const payload = {
        cliente_nome: venda.cliente_nome || null,
        cidade: venda.cidade || null,
        forma_pagamento: venda.forma_pagamento || null,
        observacao: venda.observacao || null,
        total: Number(venda.total || 0),
        rp: !!novoValor,
        rr: !!venda.rr, // mantém RR
      };

      const res = await api.put(`/vendas/${venda.id}`, payload);
      const vendaAtualizada = res.data;

      setVendas((prev) =>
        prev.map((v) =>
          v.id === venda.id ? { ...v, ...vendaAtualizada } : v
        )
      );
    } catch (error) {
      console.error("Erro ao atualizar RP:", error);
      alert("Erro ao atualizar RP.");
    }
  }

  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const dataVenda = new Date(v.created_at);

      return (
        (cidadeFiltro === "TODAS" || v.cidade === cidadeFiltro) &&
        (!dataInicio || dataVenda >= new Date(dataInicio)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`))
      );
    });
  }, [vendas, cidadeFiltro, dataInicio, dataFim]);

  return (
    <div className="vendas-motos-container">
      <h2 className="vm-title">🧾 Histórico de Vendas</h2>

      <div className="vm-card">
        <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)}>
          <option value="TODAS">Todas</option>
          {CIDADES.map((c) => (
            <option key={c}>{c}</option>
          ))}
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
          <h3>Editar venda</h3>

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