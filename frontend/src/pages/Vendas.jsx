
    import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Vendas.css";

export default function Vendas() {
  const nav = useNavigate();

  const [vendas, setVendas] = useState([]);
  const [aberta, setAberta] = useState(null);

  /* ===== FILTROS ===== */
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    api.get("/vendas")
      .then(res => setVendas(res.data || []))
      .catch(() => setVendas([]));
  }, []);

  /* ===== FUNÇÕES DE DATA ===== */
  function aplicarHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    setDataInicio(hoje);
    setDataFim(hoje);
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

  /* ===== FILTRAGEM ===== */
  const vendasFiltradas = vendas.filter(v => {
    const dataVenda = new Date(v.created_at);

    const okEmpresa =
      empresaFiltro === "TODAS" || v.empresa === empresaFiltro;

    const okCidade =
      cidadeFiltro === "TODAS" || v.cidade === cidadeFiltro;

    const okData =
      (!dataInicio || dataVenda >= new Date(dataInicio)) &&
      (!dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`));

    return okEmpresa && okCidade && okData;
  });

  /* ===== RESUMO ===== */
  const faturamentoTotal = vendasFiltradas.reduce(
    (acc, v) => acc + Number(v.total || 0),
    0
  );

  const quantidadeVendas = vendasFiltradas.length;

  const ticketMedio =
    quantidadeVendas > 0 ? faturamentoTotal / quantidadeVendas : 0;

  /* ===== CSV ===== */
  function exportarCSV() {
    const headers = ["cliente", "cidade", "total", "forma_pagamento", "data"];
    const linhas = vendasFiltradas.map(v => ({
      cliente: v.cliente_nome,
      cidade: v.cidade,
      total: v.total,
      forma_pagamento: v.forma_pagamento,
      data: new Date(v.created_at).toLocaleDateString("pt-BR")
    }));

    const csv = [
      headers.join(";"),
      ...linhas.map(l => headers.map(h => `"${l[h] ?? ""}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "historico_vendas.csv";
    link.click();
  }

  return (
    <div className="vendas-container">
      <div className="vendas-header">
        <h2>🧾 Histórico de Vendas</h2>
        <button onClick={() => nav("/home")}>⬅ Voltar</button>
      </div>

      {/* FILTROS */}
      <div className="filtros">
        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        <select value={cidadeFiltro} onChange={e => setCidadeFiltro(e.target.value)}>
          <option value="TODAS">Todas Cidades</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
          <option value="MARAGOGI">Maragogi</option>
          <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
        </select>

        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
      </div>

      {/* BOTÕES */}
      <div className="botoes-rapidos">
        <button onClick={aplicarHoje}>Hoje</button>
        <button onClick={aplicar7Dias}>7 dias</button>
        <button onClick={aplicar30Dias}>30 dias</button>
        <button onClick={aplicarMesAtual}>Mês atual</button>
        <button onClick={aplicarMesPassado}>Mês passado</button>
        <button onClick={limparDatas}>Limpar</button>
        <button onClick={exportarCSV}>📥 Exportar</button>
      </div>

      {/* RESUMO */}
      <div className="faturamento-resumo">
        <div className="card-faturamento">
          <span>💰 Faturamento (filtro)</span>
          <strong>
            R$ {faturamentoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </strong>
        </div>

        <div className="card-faturamento">
          <span>🧾 Vendas (filtro)</span>
          <strong>{quantidadeVendas}</strong>
        </div>

        <div className="card-faturamento">
          <span>🎯 Ticket médio (filtro)</span>
          <strong>
            R$ {ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </strong>
        </div>
      </div>

      {/* TABELA */}
      {vendasFiltradas.length === 0 ? (
        <p>Nenhuma venda encontrada.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Data</th>
              <th>Total</th>
              <th>Detalhes</th>
              <th>Cidade</th>
              <th>Nota</th>
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map(v => (
              <React.Fragment key={v.id}>
                <tr>
                  <td>{v.id}</td>
                  <td>{new Date(v.created_at).toLocaleString("pt-BR")}</td>
                  <td><strong>R$ {Number(v.total).toFixed(2)}</strong></td>

                  <td>
                    <button onClick={() => setAberta(aberta === v.id ? null : v.id)}>
                      {aberta === v.id ? "▲" : "▼"}
                    </button>
                  </td>

                  <td>{v.cidade || "-"}</td>

                  <td>
                    <button onClick={() => nav(`/nota?id=${v.id}`)}>
                      🧾
                    </button>
                  </td>
                </tr>

                {aberta === v.id && (
                  <tr>
                    <td colSpan={6}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div>
                          <strong>Forma de pagamento:</strong>{" "}
                          {v.forma_pagamento || "-"}
                        </div>

                        {v.observacao && (
                          <div>
                            <strong>Obs:</strong> {v.observacao}
                          </div>
                        )}

                        <ul style={{ margin: 0, paddingLeft: 18 }}>
                          {v.itens?.map((i, idx) => (
                            <li key={idx}>
                              {i.nome} — {i.quantidade} × R$ {Number(i.preco_unitario).toFixed(2)}
                            </li>
                          ))}
                        </ul>
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
  );
}