import { useEffect, useState } from "react";
import api from "../api";
import "./Revisao.css";

export default function Revisao({ user }) {
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState({
    nome_cliente: "",
    telefone: "",
    cpf: "",
    descricao: "",
    valor: "",
    trocar_oleo: "NAO",
  });

  useEffect(() => {
    carregar();
  }, []);

  function carregar() {
    api
      .get("/revisoes", { params: { role: user.role, filial: user.filial } })
      .then((r) => setLista(r.data))
      .catch(() => alert("Erro ao carregar revisões"));
  }

  function enviar(e) {
    e.preventDefault();

    api
      .post("/revisao", {
        ...form,
        filial: user.filial,
      })
      .then(() => {
        alert("Revisão salva!");
        carregar();
      })
      .catch(() => alert("Erro ao salvar revisão"));
  }

  return (
    <div className="rev-container">
      <h2 className="rev-title">🛠 Registrar Revisão</h2>

      <form className="rev-form" onSubmit={enviar}>
        <input
          type="text"
          placeholder="Nome do cliente"
          onChange={(e) => setForm({ ...form, nome_cliente: e.target.value })}
        />

        <input
          type="text"
          placeholder="Telefone"
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        />

        <input
          type="text"
          placeholder="CPF"
          onChange={(e) => setForm({ ...form, cpf: e.target.value })}
        />

        <input
          type="text"
          placeholder="Descrição da revisão"
          onChange={(e) => setForm({ ...form, descricao: e.target.value })}
        />

        <input
          type="number"
          placeholder="Valor da revisão"
          onChange={(e) => setForm({ ...form, valor: e.target.value })}
        />

        <select
          onChange={(e) => setForm({ ...form, trocar_oleo: e.target.value })}
        >
          <option value="NAO">Trocar óleo? Não</option>
          <option value="SIM">Trocar óleo? Sim (baixa automática)</option>
        </select>

        <button type="submit" className="rev-btn">
          Salvar Revisão
        </button>
      </form>

      <h2 className="rev-title">📋 Revisões Recentes</h2>

      <div className="rev-table">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Óleo</th>
              <th>Data</th>
            </tr>
          </thead>

          <tbody>
            {lista.map((r) => (
              <tr key={r.id}>
                <td>{r.nome_cliente}</td>
                <td>{r.descricao}</td>
                <td>R$ {Number(r.valor).toFixed(2)}</td>
                <td>{r.trocar_oleo === "SIM" ? "✔" : "—"}</td>
                <td>{r.data_revisao?.substring(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
