import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Emplacamentos.css";

export default function Emplacamentos() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);

  // filtro
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // ✅ NOVO: abas status
  // TODOS | PENDENTES | PAGO | ENTREGUE
  const [abaStatus, setAbaStatus] = useState("TODOS");

  // edição
  const [editando, setEditando] = useState(null); // objeto ou null

  // form
  const [cliente, setCliente] = useState("");
  const [moto, setMoto] = useState("");
  const [cidade, setCidade] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [custo, setCusto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");

  // ✅ NOVO: campos só no editar
  const [pago, setPago] = useState(false);
  const [entregue, setEntregue] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const dataUser = JSON.parse(raw);

    if (dataUser.role !== "DIRETORIA") {
      alert("Acesso restrito à Diretoria");
      return nav("/home");
    }

    setUser(dataUser);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);

  async function carregar() {
    try {
      const res = await api.get("/emplacamentos", { params: { role: "DIRETORIA" } });
      setLista(res.data || []);
    } catch (e) {
      alert("Erro ao carregar emplacamentos");
      console.error(e);
      setLista([]);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setCliente("");
    setMoto("");
    setCidade("");
    setData("");
    setValor("");
    setCusto("");
    setFormaPagamento("");

    // ✅ no NOVO, não mexe nisso (fica default false no banco)
    setPago(false);
    setEntregue(false);

    setModal(true);
  }

  function abrirEditar(item) {
    setEditando(item);

    setCliente(item.cliente || "");
    setMoto(item.moto || "");
    setCidade(item.cidade || "");

    // garante yyyy-mm-dd no input date
    const dt = item.data ? new Date(item.data) : null;
    const iso =
      dt && !Number.isNaN(dt.getTime())
        ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
        : "";
    setData(iso);

    setValor(item.valor != null ? String(item.valor) : "");
    setCusto(item.custo != null ? String(item.custo) : "");
    setFormaPagamento(item.forma_pagamento || "");

    // ✅ pega do banco
    setPago(!!item.pago);
    setEntregue(!!item.entregue);

    setModal(true);
  }

  function fecharModal() {
    setModal(false);
    setEditando(null);
  }

  async function salvar() {
    if (!cliente || !moto || !cidade || !data || valor === "" || custo === "") {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const payloadBase = {
      cliente,
      moto,
      cidade,
      data, // yyyy-mm-dd
      valor: Number(valor),
      custo: Number(custo),
      forma_pagamento: formaPagamento || null,
    };

    try {
      if (editando?.id) {
        // ✅ EDITAR (aqui vai pago/entregue)
        await api.put(`/emplacamentos/${editando.id}?role=DIRETORIA`, {
          ...payloadBase,
          pago: !!pago,
          entregue: !!entregue,
        });
      } else {
        // ✅ NOVO (não envia pago/entregue)
        await api.post(`/emplacamentos?role=DIRETORIA`, payloadBase);
      }

      fecharModal();
      await carregar();
    } catch (e) {
      const msg = e?.response?.data?.message || "Erro ao salvar";
      alert(msg);
      console.error(e);
    }
  }

  // opções de cidade (baseado no que tem na lista)
  const cidadesDisponiveis = useMemo(() => {
    const set = new Set();
    (lista || []).forEach((e) => {
      const c = (e.cidade || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort();
  }, [lista]);

  // aplica filtros
  const listaFiltrada = useMemo(() => {
    return (lista || []).filter((e) => {
      const c = (e.cidade || "").trim();

      // cidade
      const okCidade = cidadeFiltro === "TODAS" || c === cidadeFiltro;

      // data
      const dt = e.data ? new Date(e.data) : null;
      const okDt = dt && !Number.isNaN(dt.getTime());

      const okInicio = !dataInicio || (okDt && dt >= new Date(`${dataInicio}T00:00:00`));
      const okFim = !dataFim || (okDt && dt <= new Date(`${dataFim}T23:59:59`));

      // ✅ aba status
      const isPago = !!e.pago;
      const isEntregue = !!e.entregue;
      const okAba = (() => {
        if (abaStatus === "TODOS") return true;
        if (abaStatus === "PAGO") return isPago === true;
        if (abaStatus === "ENTREGUE") return isEntregue === true;
        if (abaStatus === "PENDENTES") return !isPago || !isEntregue; // pendente se falta algum
        return true;
      })();

      return okCidade && okInicio && okFim && okAba;
    });
  }, [lista, cidadeFiltro, dataInicio, dataFim, abaStatus]);

  function limparFiltros() {
    setCidadeFiltro("TODAS");
    setDataInicio("");
    setDataFim("");
    setAbaStatus("TODOS");
  }

  function formatBRL(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return "-";
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  if (!user) return null;

  return (
    <div className="emplac-container">
      <div className="emplac-header">
        <h2>🪪 Emplacamentos</h2>
        <div className="emplac-header-actions">
          <button onClick={abrirNovo}>➕ Novo</button>
          <button onClick={() => nav("/home")}>⬅ Voltar</button>
        </div>
      </div>

      {/* ✅ ABAS */}
      <div className="emplac-tabs">
        <button
          className={`emplac-tab ${abaStatus === "TODOS" ? "active" : ""}`}
          onClick={() => setAbaStatus("TODOS")}
        >
          Todos
        </button>
        <button
          className={`emplac-tab ${abaStatus === "PENDENTES" ? "active" : ""}`}
          onClick={() => setAbaStatus("PENDENTES")}
        >
          Pendentes
        </button>
        <button
          className={`emplac-tab ${abaStatus === "PAGO" ? "active" : ""}`}
          onClick={() => setAbaStatus("PAGO")}
        >
          Pago
        </button>
        <button
          className={`emplac-tab ${abaStatus === "ENTREGUE" ? "active" : ""}`}
          onClick={() => setAbaStatus("ENTREGUE")}
        >
          Entregue
        </button>
      </div>

      {/* ✅ FILTROS */}
      <div className="emplac-filtros">
        <div className="emplac-field">
          <label>Cidade</label>
          <select value={cidadeFiltro} onChange={(e) => setCidadeFiltro(e.target.value)}>
            <option value="TODAS">Todas</option>
            {cidadesDisponiveis.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="emplac-field">
          <label>Data início</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>

        <div className="emplac-field">
          <label>Data fim</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>

        <div className="emplac-field emplac-field-actions">
          <button className="emplac-btn-ghost" onClick={limparFiltros}>Limpar</button>
        </div>
      </div>

      <table className="emplac-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Moto</th>
            <th>Cidade</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Custo</th>
            <th>Loja (Lucro)</th>
            <th>Forma</th>
            <th>Pago</th>
            <th>Entregue</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>
          {listaFiltrada.map((e) => {
            const lucro = Number(e.valor || 0) - Number(e.custo || 0);

            return (
              <tr key={e.id}>
                <td>{e.cliente}</td>
                <td>{e.moto}</td>
                <td>{e.cidade}</td>
                <td>{e.data ? new Date(e.data).toLocaleDateString("pt-BR") : "-"}</td>
                <td>{formatBRL(e.valor)}</td>
                <td>{formatBRL(e.custo)}</td>
                <td className="emplac-lucro">{formatBRL(lucro)}</td>
                <td>{e.forma_pagamento || "-"}</td>
                <td>{e.pago ? "✅" : "—"}</td>
                <td>{e.entregue ? "✅" : "—"}</td>
                <td>
                  <button className="emplac-btn-edit" onClick={() => abrirEditar(e)}>
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            );
          })}

          {listaFiltrada.length === 0 && (
            <tr>
              <td colSpan={11} style={{ textAlign: "center", opacity: 0.7, padding: 14 }}>
                Nenhum registro com esses filtros.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* MODAL */}
      {modal && (
        <div className="emplac-modal-overlay">
          <div className="emplac-modal">
            <h3>{editando ? "Editar Emplacamento" : "Novo Emplacamento"}</h3>

            <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            <input placeholder="Moto" value={moto} onChange={(e) => setMoto(e.target.value)} />
            <input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
            <input type="number" placeholder="Custo" value={custo} onChange={(e) => setCusto(e.target.value)} />

            <div className="emplac-preview-lucro">
              Loja (lucro): {formatBRL(Number(valor || 0) - Number(custo || 0))}
            </div>

            <input
              placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
            />

            {/* ✅ SOMENTE NO EDITAR */}
            {editando?.id && (
              <div className="emplac-status-box">
                <label className="emplac-check">
                  <input
                    type="checkbox"
                    checked={pago}
                    onChange={(e) => setPago(e.target.checked)}
                  />
                  Pago
                </label>

                <label className="emplac-check">
                  <input
                    type="checkbox"
                    checked={entregue}
                    onChange={(e) => setEntregue(e.target.checked)}
                  />
                  Entregue
                </label>
              </div>
            )}

            <div className="emplac-modal-actions">
              <button onClick={salvar}>Salvar</button>
              <button onClick={fecharModal}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}