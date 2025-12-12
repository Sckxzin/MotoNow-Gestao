// src/pages/Vendas.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Vendas.css";

export default function Vendas() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    if (!user) return;

    axios
      .get("http://localhost:5000/vendas", {
        params: {
          role: user.role,
          filial: user.filial
        }
      })
      .then(res => setVendas(res.data))
      .catch(() => alert("Erro ao carregar vendas!"));
  }, [user.role, user.filial]);

  function imprimir(vendaId) {
    axios
      .get(`http://localhost:5000/vendas/${vendaId}`)
      .then(res => {
        localStorage.setItem("notaFiscal", JSON.stringify(res.data));
        nav("/nota");
      })
      .catch(() => alert("Erro ao carregar venda para impressão."));
  }

  return (
    <div className="vendas-container">
      <h2 className="titulo-vendas">🧾 Histórico de Vendas</h2>

      <table className="tabela-vendas">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cliente</th>
            <th>Peça</th>
            <th>Qtd</th>
            <th>Total</th>
            <th>Filial</th>
            <th>Data</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>
          {vendas.length === 0 && (
            <tr>
              <td colSpan="8" style={{ textAlign: "center", padding: 20 }}>
                Nenhuma venda registrada.
              </td>
            </tr>
          )}

          {vendas.map(v => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td>{v.nome_cliente}</td>
              <td>{v.peca || v.peca_id}</td>
              <td>{v.quantidade}</td>
              <td>R$ {Number(v.total).toFixed(2)}</td>
              <td>{v.filial}</td>
              <td>
                {v.data_venda
                  ? new Date(v.data_venda).toLocaleString()
                  : v.data
                  ? new Date(v.data).toLocaleString()
                  : ""}
              </td>
              <td>
                <button
                  className="btn-imprimir"
                  onClick={() => imprimir(v.id)}
                >
                  Imprimir Nota
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
