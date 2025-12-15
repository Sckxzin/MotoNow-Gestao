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

  useEffect(() => {
    api.get(`/motos`, { params: {} })
      .then(res => {
        const encontrada = res.data.find(m => m.id === Number(id));
        setMoto(encontrada);
      })
      .catch(() => alert("Erro ao carregar moto!"));
  }, [id]);

  function handleChange(e) {
    setCliente({ ...cliente, [e.target.name]: e.target.value });
  }

  function vender() {
    if (!cliente.nome || !cliente.cpf) {
      alert("Preencha nome e CPF!");
      return;
    }

    api.post("/vender-moto", {
      moto_id: id,
      nome_cliente: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf,
      filial: moto.filial
    })
    .then(res => {
      alert("Moto vendida com sucesso!");
      nav("/home");
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao vender moto!");
    });
  }

  if (!moto)
    return <h3 style={{ padding: 20 }}>Carregando dados da moto...</h3>;

  return (
    <div className="vender-container">
      <h2>🛵 Vender Moto</h2>

      <div className="moto-info">
        <p><b>Modelo:</b> {moto.modelo}</p>
        <p><b>Cor:</b> {moto.cor}</p>
        <p><b>Chassi:</b> {moto.chassi}</p>
        <p><b>Filial:</b> {moto.filial}</p>
      </div>

      <h3>📄 Dados do Cliente</h3>

      <input
        type="text"
        name="nome"
        placeholder="Nome do Cliente"
        value={cliente.nome}
        onChange={handleChange}
        className="input"
      />

      <input
        type="text"
        name="telefone"
        placeholder="Telefone"
        value={cliente.telefone}
        onChange={handleChange}
        className="input"
      />

      <input
        type="text"
        name="cpf"
        placeholder="CPF"
        value={cliente.cpf}
        onChange={handleChange}
        className="input"
      />

      <button className="btn-vender" onClick={vender}>
        Finalizar Venda
      </button>

      <button className="btn-voltar" onClick={() => nav(-1)}>
        Voltar
      </button>
    </div>
  );
}
