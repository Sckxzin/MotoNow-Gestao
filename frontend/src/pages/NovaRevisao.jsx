import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function NovaRevisao() {
  const nav = useNavigate();

  const [form, setForm] = useState({
    cidade: "",
    cliente_nome: "",
    cliente_telefone: "",
    modelo_moto: "",
    chassi_moto: "",
    km: "",
    tipo_revisao: ""
  });

  function criarRevisao() {
    api.post("/revisoes", form)
      .then(res => {
        alert("Revisão criada");
        nav(`/revisao/${res.data.id}`);
      })
      .catch(err => alert(err.response?.data?.message || "Erro"));
  }

  return (
    <div>
      <h2>Nova Revisão</h2>

      <input placeholder="Filial"
        onChange={e => setForm({...form, cidade: e.target.value})} />

      <input placeholder="Cliente"
        onChange={e => setForm({...form, cliente_nome: e.target.value})} />

      <input placeholder="Telefone"
        onChange={e => setForm({...form, cliente_telefone: e.target.value})} />

      <input placeholder="Modelo da moto"
        onChange={e => setForm({...form, modelo_moto: e.target.value})} />

      <input placeholder="Chassi"
        onChange={e => setForm({...form, chassi_moto: e.target.value})} />

      <input placeholder="KM"
        type="number"
        onChange={e => setForm({...form, km: e.target.value})} />

      <input placeholder="Tipo de revisão"
        onChange={e => setForm({...form, tipo_revisao: e.target.value})} />

      <button onClick={criarRevisao}>
        Criar Revisão
      </button>
    </div>
  );
}
