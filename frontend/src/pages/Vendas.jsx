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

  /* ===== FILTROS ===== */
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  /* ===== EDIÇÃO ===== */
  const [modalEditar, setModalEditar] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [vendaEditando, setVendaEditando] = useState(null);

  const [formEdicao, setFormEdicao] = useState({
    cliente_nome: "",
    cidade: "",
    forma_pagamento: "",
    observacao: "",
    total: "",
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

  /* ===== HELPERS ===== */
  function formatarValor(valor) {
    if (valor == null || valor === "" || Number.isNaN(Number(valor))) return "-";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [
      headers.join(";"),
      ...dados.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(";")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  /* ===== FUNÇÕES DE DATA ===== */
  function aplicarHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    setDataInicio(hoje);
    setDataFim(hoje);
  }

  function aplicarOntem() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const data = ontem.toISOString().slice(0, 10);
    setDataInicio(data);
    setDataFim(data);
  }

  function aplicar7Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 7);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicar30Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 30);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicarMesAtual() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicarMesPassado() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function limparDatas() {
    setDataInicio("");
    setDataFim("");
  }

  /* ===== EDIÇÃO ===== */
  function abrirModalEdicao(v) {
    setVendaEditando(v);
    setFormEdicao({
      cliente_nome: v.cliente_nome || "",
      cidade: v.cidade || "",
      forma_pagamento: v.forma_pagamento || "",
      observacao: v.observacao || "",
      total: v.total != null ? String(v.total) : "",
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
    });
  }

  function alterarCampoEdicao(e) {
    const { name, value } = e.target;
    setFormEdicao((prev) => ({
      ...prev,
      [name]: value,
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

  /* ===== FILTRAGEM ===== */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const dataVenda = new Date(v.created_at);

      const okCidade =
        cidadeFiltro === "TODAS" || v.cidade === cidadeFiltro;

      const okData =
        (!dataInicio || dataVenda >= new Date(`${dataInicio}T00:00:00`)) &&
        (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));

      return okCidade && okData;
    });
  }, [vendas, cidadeFiltro, dataInicio, dataFim]);

  /* ===== RESUMO ===== */
  const faturamentoTotal = useMemo(() => {
    return vendasFiltradas.reduce((acc, v) => acc + Number(v.total || 0), 0);
  }, [vendasFiltradas]);

  const quantidadeVendas = vendasFiltradas.length;

  const ticketMedio = useMemo(() => {
    return quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0;
  }, [faturamentoTotal, quantidadeVendas]);

  return (
    <div className="vendas-motos-container">
      <div className="vm-topbar">
        <div>
          <h2 className="vm-title">🧾 Histórico de Vendas</h2>
          <p className="vm-subtitle">
            Filtre rápido e exporte exatamente o que está na tela.
          </p>
        </div>

        <div className="vm-topbar-actions">
          <button className="vm-btn vm-btn-ghost" onClick={() => nav("/home")}>
            ⬅ Voltar
          </button>

          <button
            className="vm-btn vm-btn-primary"
            onClick={() =>
              exportarCSV(
                "historico_vendas.csv",
                ["id", "cliente", "cidade", "total", "forma_pagamento", "data", "observacao"],
                vendasFiltradas.map((v) => ({
                  id: v.id,
                  cliente: v.cliente_nome,
                  cidade: v.cidade,
                  total: Number(v.total || 0).toFixed(2),
                  forma_pagamento: v.forma_pagamento || "",
                  data: new Date(v.created_at).toLocaleDateString("pt-BR"),
                  observacao: v.observacao || "",
                }))
              )
            }
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      <div className="vm-card">
        <div className="vm-filters-grid">
          <div className="vm-field">
            <label>Cidade</label>
            <select
              value={cidadeFiltro}
              onChange={(e) => setCidadeFiltro(e.target.value)}
            >
              <option value="TODAS">Todas</option>
              {CIDADES.map((cidade) => (
                <option key={cidade} value={cidade}>
                  {cidade}
                </option>
              ))}
            </select>
          </div>

          <div className="vm-field">
            <label>Data início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="vm-field">
            <label>Data fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
        </div>

        <div className="vm-quickbar">
          <button className="vm-btn vm-btn-soft" onClick={aplicarHoje}>Hoje</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarOntem}>Ontem</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar7Dias}>7 dias</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicar30Dias}>30 dias</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesAtual}>Mês atual</button>
          <button className="vm-btn vm-btn-soft" onClick={aplicarMesPassado}>Mês passado</button>
          <button className="vm-btn vm-btn-ghost" onClick={limparDatas}>Limpar datas</button>
        </div>
      </div>

      <div className="vm-stats">
        <div className="vm-stat">
          <div className="vm-stat-label">Faturamento</div>
          <div className="vm-stat-value">{formatarValor(faturamentoTotal)}</div>
        </div>

        <div className="vm-stat">
          <div className="vm-stat-label">Qtd. vendas</div>
          <div className="vm-stat-value">{quantidadeVendas}</div>
        </div>

        <div className="vm-stat vm-stat-highlight">
          <div className="vm-stat-label">Ticket médio</div>
          <div className="vm-stat-value">{formatarValor(ticketMedio)}</div>
        </div>
      </div>

      <div className="table-container vm-table-card">
        {vendasFiltradas.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", opacity: 0.7 }}>
            Nenhuma venda encontrada.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Cidade</th>
                <th>Detalhes</th>
                <th>Editar</th>
                <th>Nota</th>
              </tr>
            </thead>

            <tbody>
              {vendasFiltradas.map((v) => (
                <React.Fragment key={v.id}>
                  <tr>
                    <td>{v.id}</td>
                    <td>{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                    <td>{v.cliente_nome || "-"}</td>
                    <td>
                      <strong>{formatarValor(v.total)}</strong>
                    </td>
                    <td>{v.forma_pagamento || "-"}</td>
                    <td>{v.cidade || "-"}</td>

                    <td>
                      <button
                        className="action-btn"
                        onClick={() => setAberta(aberta === v.id ? null : v.id)}
                      >
                        {aberta === v.id ? "▲" : "▼"}
                      </button>
                    </td>

                    <td>
                      <button
                        className="action-btn"
                        onClick={() => abrirModalEdicao(v)}
                        title="Editar venda"
                      >
                        ✏️
                      </button>
                    </td>

                    <td>
                      <button
                        className="action-btn"
                        onClick={() => nav(`/nota?id=${v.id}`)}
                      >
                        🧾
                      </button>
                    </td>
                  </tr>

                  {aberta === v.id && (
                    <tr>
                      <td colSpan={9}>
                        <div className="vendas-detalhes-box">
                          <div>
                            <strong>Forma de pagamento:</strong> {v.forma_pagamento || "-"}
                          </div>

                          {v.observacao && (
                            <div style={{ marginTop: 8 }}>
                              <strong>Obs:</strong> {v.observacao}
                            </div>
                          )}

                          <div style={{ marginTop: 8 }}>
                            <strong>Itens:</strong>
                            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                              {v.itens?.length > 0 ? (
                                v.itens.map((i, idx) => (
                                  <li key={idx}>
                                    {i.nome} — {i.quantidade} × R${" "}
                                    {Number(i.preco_unitario).toFixed(2)}
                                  </li>
                                ))
                              ) : (
                                <li>Nenhum item encontrado</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalEditar && (
        <div className="vm-modal-overlay" onClick={fecharModalEdicao}>
          <div className="vm-modal vm-modal-venda" onClick={(e) => e.stopPropagation()}>
            <div className="vm-modal-header">
              <div>
                <h3>Editar venda #{vendaEditando?.id}</h3>
                <p>Atualize os dados principais da venda.</p>
              </div>

              <button
                className="vm-modal-close"
                onClick={fecharModalEdicao}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="vm-modal-grid">
              <div className="vm-field vm-col-2">
                <label>Cliente</label>
                <input
                  type="text"
                  name="cliente_nome"
                  value={formEdicao.cliente_nome}
                  onChange={alterarCampoEdicao}
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="vm-field">
                <label>Cidade</label>
                <select
                  name="cidade"
                  value={formEdicao.cidade}
                  onChange={alterarCampoEdicao}
                >
                  <option value="">Selecione</option>
                  {CIDADES.map((cidade) => (
                    <option key={cidade} value={cidade}>
                      {cidade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="vm-field">
                <label>Forma de pagamento</label>
                <input
                  type="text"
                  name="forma_pagamento"
                  value={formEdicao.forma_pagamento}
                  onChange={alterarCampoEdicao}
                  placeholder="Ex: PIX, DINHEIRO, DÉBITO"
                />
              </div>

              <div className="vm-field">
                <label>Valor total</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="total"
                  value={formEdicao.total}
                  onChange={alterarCampoEdicao}
                  placeholder="0.00"
                />
              </div>

              <div className="vm-field vm-col-4">
                <label>Observação</label>
                <textarea
                  name="observacao"
                  value={formEdicao.observacao}
                  onChange={alterarCampoEdicao}
                  rows={5}
                  placeholder="Digite alguma observação da venda..."
                />
              </div>
            </div>

            <div className="vm-modal-actions">
              <button
                className="vm-btn vm-btn-ghost"
                onClick={fecharModalEdicao}
                type="button"
              >
                Cancelar
              </button>

              <button
                className="vm-btn vm-btn-primary"
                onClick={salvarEdicao}
                disabled={salvandoEdicao}
                type="button"
              >
                {salvandoEdicao ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}