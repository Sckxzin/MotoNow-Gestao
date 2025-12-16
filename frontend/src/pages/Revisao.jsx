import { useEffect, useState } from "react";
import api from "../api";
import "./Revisao.css";

export default function Revisao() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [revisoes, setRevisoes] = useState([]);
  const [form, setForm] = useState({
    nome_cliente: "",
    telefone: "",
    cpf: "",
    descricao: "",
    trocar_oleo: "NÃO"
  });

  // 🔥 Carregar revisões existentes
  useEffect(() => {
    api
      .get("/revisoes", { params: { role: user.role, filial: user.filial } })
      .then((res) => setRevisoes(res.data))
      .catch(() => alert("Erro ao carregar revisões"));
  }, []);

  function atualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviarRevisao() {
    if (!form.nome_cliente || !form.descricao) {
      return alert("Preencha pelo menos nome e descrição!");
    }

    try {
      const res = await api.post("/revisao", {
        ...form,
        filial: user.filial,
        valor: 0 // MODELO C não usa valor
      });

      alert(res.data.message);

      // Atualizar lista imediatamente
      setRevisoes((prev) => [
        {
          ...form,
          filial: user.filial,
          data_revisao: new Date(),
        },
        ...prev,
      ]);

      // Limpar formulário
      setForm({
        nome_cliente: "",
        telefone: "",
        cpf: "",
        descricao: "",
        trocar_oleo: "NÃO",
      });

    } catch (err) {
      console.error(err);
      alert("Erro ao registrar revisão!");
    }
  }

  return (
    <div className="rev-container">
      <h2>🛠 Registrar Revisão</h2>

      <div className="rev-form">
        <input
          placeholder="Nome do cliente"
          value={form.nome_cliente}
          onChange={(e) => atualizarCampo("nome_cliente", e.target.value)}
        />

        <input
          placeholder="Telefone"
          value={form.telefone}
          onChange={(e) => atualizarCampo("telefone", e.target.value)}
        />

        <input
          placeholder="CPF"
          value={form.cpf}
          onChange={(e) => atualizarCampo("cpf", e.target.value)}
        />

        <textarea
          placeholder="Descrição do serviço"
          value={form.descricao}
          onChange={(e) => atualizarCampo("descricao", e.target.value)}
        ></textarea>

        <label>Trocar óleo?</label>
        <select
          value={form.trocar_oleo}
          onChange={(e) => atualizarCampo("trocar_oleo", e.target.value)}
        >
          <option value="NÃO">NÃO</option>
          <option value="SIM">SIM</option>
        </select>

        <button className="rev-btn" onClick={enviarRevisao}>
          ✔ Registrar Revisão
        </button>
      </div>

      <h2>📋 Revisões Realizadas</h2>

      <table className="rev-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Troca de Óleo</th>
            <th>Filial</th>
            <th>Data</th>
          </tr>
        </thead>

        <tbody>
          {revisoes.map((r, i) => (
            <tr key={i}>
              <td>{r.nome_cliente}</td>
              <td>{r.descricao}</td>
              <td>{r.trocar_oleo}</td>
              <td>{r.filial}</td>
              <td>
                {r.data_revisao
                  ? new Date(r.data_revisao).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
