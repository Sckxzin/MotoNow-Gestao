.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Vendas.css";

export default function Vendas() {
  const nav = useNavigate();

  const [vendas, setVendas] = useState([]);
  const [aberta, setAberta] = useState(null);

function exportarCSV(nomeArquivo, headers, dados) {
  const csv = [
    headers.join(";"),
    ...dados.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(";")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}

  // 🔹 filtros
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
  const [mesFiltro, setMesFiltro] = useState("");

  useEffect(() => {
    api
      .get("/vendas")
      .then(res => {
        setVendas(res.data || []);
      })
      .catch(err => {
        console.error("Erro ao buscar vendas:", err);
        setVendas([]);
      });
  }, []);

  // 🔹 vendas filtradas
  const vendasFiltradas = vendas.filter(v => {
    const okCidade =
      cidadeFiltro === "TODAS" || v.cidade === cidadeFiltro;

    const okMes = (() => {
      if (!mesFiltro) return true;

      const data = new Date(v.created_at);
      const mesVenda = `${data.getFullYear()}-${String(
        data.getMonth() + 1
      ).padStart(2, "0")}`;

      return mesVenda === mesFiltro;
    })();

    return okCidade && okMes;
  });

  return (
    <div className="vendas-container">
      <div className="vendas-header">
        <h2>🧾 Histórico de Vendas</h2>
        <button className="btn-voltar" onClick={() => nav("/home")}>
          ⬅ Voltar
        </button>
      </div>

      {/* ===== FILTROS ===== */}
      <div className="filtros-historico">
        <select
          value={cidadeFiltro}
          onChange={e => setCidadeFiltro(e.target.value)}
        >
          <option value="TODAS">Todas as cidades</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
        </select>

        <input
          type="month"
          value={mesFiltro}
          onChange={e => setMesFiltro(e.target.value)}
        />
      </div>
<button
  onClick={() =>
    exportarCSV(
      "historico_vendas_pecas.csv",
      [
        "cliente",
        "cidade",
        "total",
        "data"
      ],
      vendasFiltradas.map(v => ({
        cliente: v.cliente_nome,
        cidade: v.cidade,
        total: v.total,
        data: new Date(v.created_at).toLocaleDateString("pt-BR")
      }))
    )
  }
>
  📥 Exportar Histórico de Vendas
</button>

      {/* ===== TABELA ===== */}
      {vendasFiltradas.length === 0 ? (
        <p>Nenhuma venda registrada.</p>
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
              <>
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>
                    {new Date(v.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td>
                    <strong>R$ {Number(v.total).toFixed(2)}</strong>
                  </td>

                  <td>
                    <button
                      className="btn-detalhes"
                      onClick={() =>
                        setAberta(aberta === v.id ? null : v.id)
                      }
                    >
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
                      <ul className="lista-itens">
                        {v.itens.map((i, idx) => (
                          <li key={idx}>
                            {i.nome} — {i.quantidade} × R${" "}
                            {Number(i.preco_unitario).toFixed(2)}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}