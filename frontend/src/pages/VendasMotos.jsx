// src/pages/VendasMotos.jsx
import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);

  useEffect(() => {
    api
      .get("/vendas-motos")
      .then(res => {
        setVendas(res.data || []);
      })
      .catch(err => {
        console.error("Erro histórico motos:", err);
        alert("Erro ao carregar histórico de motos");
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🏍 Histórico de Vendas de Motos</h2>

      <button onClick={() => nav("/home")}>⬅ Voltar</button>

      {vendas.length === 0 ? (
        <p>Nenhuma moto vendida ainda.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Brinde</th>
              <th>Gasolina</th>
              <th>Como Chegou</th>
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
                <td>{v.forma_pagamento}</td>
                <td>{v.brinde ? "Sim" : "Não"}</td>
                <td>{v.gasolina ? "Sim" : "Não"}</td>
                <td>{v.como_chegou}</td>
                <td>
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
