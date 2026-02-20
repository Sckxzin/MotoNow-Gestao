import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "./Revisoes.css";

export default function Revisoes() {
  const nav = useNavigate();
  const [revisoes, setRevisoes] = useState([]);

  useEffect(() => {
    carregarRevisoes();
  }, []);

  function carregarRevisoes() {
    api.get("/revisoes")
      .then(res => setRevisoes(res.data || []))
      .catch(() => alert("Erro ao carregar revisões"));
  }

  return (
    <div className="revisoes-container">
      <h2>🛠 Histórico de Revisões</h2>

      <button onClick={() => nav("/nova-revisao")}>
        ➕ Nova Revisão
      </button>

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Cliente</th>
            <th>Moto</th>
            <th>Tipo</th>
            <th>Total</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>

        <tbody>
          {revisoes.map(r => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
              <td>{r.cliente_nome}</td>
              <td>{r.modelo_moto}</td>
              <td>{r.tipo_revisao}</td>
              <td>R$ {Number(r.total).toFixed(2)}</td>
              <td>{r.status}</td>
              <td>
                <button onClick={() => nav(`/revisao/${r.id}`)}>
                  👁 Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
