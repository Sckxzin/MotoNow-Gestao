import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./VendasMotos.css";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      nav("/");
      return;
    }

    api
      .get("/vendas-motos")
      .then(res => setVendas(res.data || []))
      .catch(err => {
        console.error(err);
        setVendas([]);
      })
      .finally(() => setLoading(false));
  }, [nav]);

  if (loading) {
    return <p style={{ padding: 20 }}>Carregando histórico...</p>;
  }

  return (
    <div className="vendas-motos-container">
      <div className="header">
        <h2>📜 Histórico de Vendas de Motos</h2>
        <button onClick={() => nav("/home")}>⬅ Voltar</button>
      </div>

      {vendas.length === 0 ? (
        <p>Nenhuma venda registrada.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Cor</th>
                <th>Chassi</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Brinde</th>
                <th>Gasolina</th>
                <th>Pagamento</th>
                <th>Como chegou</th>
                <th>Filial</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map(v => (
                <tr key={v.id}>
                  <td>{v.modelo}</td>
                  <td>{v.cor}</td>
                  <td>{v.chassi}</td>
                  <td>{v.nome_cliente}</td>
                  <td>R$ {Number(v.valor).toFixed(2)}</td>
                  <td>{v.brinde ? "Sim" : "Não"}</td>
                  <td>{v.gasolina ? "Sim" : "Não"}</td>
                  <td>{v.pagamento}</td>
                  <td>{v.como_chegou}</td>
                  <td>{v.filial}</td>
                  <td>
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
