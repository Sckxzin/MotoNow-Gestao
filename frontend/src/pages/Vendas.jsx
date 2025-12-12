// src/pages/Vendas.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api"; // 🔥 usando a API correta (Railway)
import "./Vendas.css";

export default function Vendas() {
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    if (!user) return;

    api
      .get("/vendas", {
        params: {
          role: user.role,
          filial: user.filial
        }
      })
      .then(res => setVendas(res.data))
      .catch(() => alert("Erro ao carregar vendas!"));
  }, [user.role, user.filial]);

  function imprimir(venda) {
    // 🔥 Como seu backend NÃO tem GET /vendas/:id
    // salvamos a venda diretamente
    localStorage.setItem("notaFiscal", JSON.stringify({
      nome_cliente: venda.nome_cliente,
      telefone: venda.telefone,
      cpf: venda.cpf,
      quantidade: venda.quantidade,
      preco_unitario: venda.preco_unitario,
      total: venda.total,
      peca: venda.nome_peca,
      codigo: venda.codigo_peca,
      filial: venda.filial,
      data: venda.data_venda || venda.data
    }));

    nav("/nota");
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
              <td>{v.nome_peca}</td>
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
                  onClick={() => imprimir(v)}
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
