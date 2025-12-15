import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Revisao.css";

export default function Revisao() {
  const nav = useNavigate();

  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [trocarOleo, setTrocarOleo] = useState("NAO");

  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    nav("/");
  }

  async function enviarRevisao(e) {
    e.preventDefault();

    try {
      const res = await api.post("/revisao", {
        nome_cliente: nomeCliente,
        telefone,
        cpf,
        descricao,
        valor,
        trocar_oleo: trocarOleo,
        filial: user.filial,
      });

      alert(res.data.message);
      nav("/home");

    } catch (error) {
      console.error(error);
      alert("Erro ao registrar revisão!");
    }
  }

  return (
    <div className="revisao-container">
      <h2>🛠 Registrar Revisão</h2>

      <form className="revisao-form" onSubmit={enviarRevisao}>

        <label>Nome do Cliente</label>
        <input
          type="text"
          value={nomeCliente}
          onChange={(e) => setNomeCliente(e.target.value)}
          required
        />

        <label>Telefone</label>
        <input
          type="text"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <label>CPF</label>
        <input
          type="text"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />

        <label>Descrição do Serviço</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          required
        ></textarea>

        <label>Valor da Revisão (R$)</label>
        <input
          type="number"
          step="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />

        <label>Trocar Óleo?</label>
        <select
          value={trocarOleo}
          onChange={(e) => setTrocarOleo(e.target.value)}
        >
          <option value="NAO">NÃO</option>
          <option value="SIM">SIM</option>
        </select>

        <button type="submit" className="btn-salvar">
          Salvar Revisão
        </button>
      </form>

      <button className="btn-voltar" onClick={() => nav("/home")}>
        ⬅ Voltar
      </button>
    </div>
  );
}
