import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Vendas.css";

export default function Vendas() {
  const nav = useNavigate();

  const [vendas, setVendas] = useState([]);
  const [aberta, setAberta] = useState(null);

  useEffect(() => {
    api.get("/vendas")
      .then(res => {
        setVendas(res.data || []);
      })
      .catch(err => {
        console.error("Erro ao buscar vendas:", err);
        setVendas([]);
      });
  }, []);

  return (
    <div className="vendas-container">
      <div className="vendas-header">
        <h2>🧾 Histórico de Vendas</h2>
        <button className="btn-voltar" onClick={() => nav("/home")}>
          ⬅ Voltar
        </button>
      </div>

      {vendas.length === 0 ? (
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
            {vendas.map(v => (
              <tbody key={v.id}>
                <tr>
                  <td>{v.id}</td>
                  <td>{new Date(v.created_at).toLocaleString()}</td>
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
                    <button
                      onClick={() => nav(`/nota?id=${v.id}`)}
                    >
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
              </tbody>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
