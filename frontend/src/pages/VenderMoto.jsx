/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "./VenderMoto.css";

export default function VenderMoto() {
  const { id } = useParams();
  const nav = useNavigate();

  const [moto, setMoto] = useState(null);
  const [cliente, setCliente] = useState({
    nome: "",
    telefone: "",
    cpf: ""
  });

  // 🔥 Carregar a moto pelo ID direto do backend
  useEffect(() => {
    api.get(`/moto/${id}`)
      .then((res) => setMoto(res.data))
      .catch((err) => {
        console.error(err);
        alert("Moto não encontrada!");
        nav("/home");
      });
  }, [id, nav]);

  function handleChange(e) {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
  }

  function venderMoto() {
    if (!cliente.nome || !cliente.telefone || !cliente.cpf) {
      alert("Preencha todos os campos do cliente!");
      return;
    }

    api.post("/vender-moto", {
      moto_id: id,
      nome_cliente: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf,
      filial: moto.filial
    })
    .then((res) => {
      alert("Moto vendida com sucesso!");
      nav("/home");
    })
    .catch((err) => {
      console.error(err);
      alert("Erro ao vender moto!");
    });
  }

  if (!moto) {
    return <h2 style={{ padding: "20px" }}>Carregando dados da moto...</h2>;
  }

  return (
    <div className="vender-moto-container">
      <h2>Venda de Moto</h2>

      <div className="moto-info">
        <p><strong>Modelo:</strong> {moto.modelo}</p>
        <p><strong>Cor:</strong> {moto.cor}</p>
        <p><strong>Chassi:</strong> {moto.chassi}</p>
        <p><strong>Filial:</strong> {moto.filial}</p>
      </div>

      <h3>Dados do Cliente</h3>

      <input
        type="text"
        name="nome"
        placeholder="Nome do cliente"
        className="input"
        value={cliente.nome}
        onChange={handleChange}
      />

      <input
        type="text"
        name="telefone"
        placeholder="Telefone"
        className="input"
        value={cliente.telefone}
        onChange={handleChange}
      />

      <input
        type="text"
        name="cpf"
        placeholder="CPF"
        className="input"
        value={cliente.cpf}
        onChange={handleChange}
      />

      <button className="btn-vender" onClick={venderMoto}>
        Finalizar Venda
      </button>
    </div>
  );
}
