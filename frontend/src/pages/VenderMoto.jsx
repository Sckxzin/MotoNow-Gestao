/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import "./VenderMoto.css";

export default function VenderMoto() {
  const { id } = useParams();
  const nav = useNavigate();

  const [moto, setMoto] = useState(null);

  // Dados do cliente / venda
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  const [valorMoto, setValorMoto] = useState("");
  const [gasolina, setGasolina] = useState("");
  const [capaceteBrinde, setCapaceteBrinde] = useState("SIM");
  const [chegada, setChegada] = useState("WHATSAPP");
  const [formaPagamento, setFormaPagamento] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    api.get(`/moto/${id}`).then((res) => setMoto(res.data));
  }, [id]);

  if (!moto) return <h2 style={{ padding: 20 }}>Carregando moto...</h2>;

  function venderMoto() {
    if (!nomeCliente || !cpf || !valorMoto) {
      return alert("Preencha cliente, CPF e valor da moto!");
    }

    api
      .post("/vender-moto", {
        moto_id: moto.id,
        nome_cliente: nomeCliente,
        telefone,
        cpf,
        filial: user.filial,
        gasolina,
        valor: valorMoto,
        capacete_brinde: capaceteBrinde,
        chegada,
        forma_pagamento: formaPagamento
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

  return (
    <div className="vender-container">
      <h2>Vender Moto</h2>

      <div className="moto-info">
        <p><b>Modelo:</b> {moto.modelo}</p>
        <p><b>Cor:</b> {moto.cor}</p>
        <p><b>Chassi:</b> {moto.chassi}</p>
        <p><b>Filial:</b> {moto.filial}</p>
      </div>

      <hr />

      <h3>Dados do Cliente</h3>
      <input
        className="input"
        type="text"
        placeholder="Nome do Cliente"
        value={nomeCliente}
        onChange={(e) => setNomeCliente(e.target.value)}
      />

      <input
        className="input"
        type="text"
        placeholder="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
      />

      <input
        className="input"
        type="text"
        placeholder="CPF"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
      />

      <hr />

      <h3>Informações da Venda</h3>

      {/* Valor da moto - primeiro campo */}
      <input
        className="input"
        type="number"
        placeholder="Valor da Moto (R$)"
        value={valorMoto}
        onChange={(e) => setValorMoto(e.target.value)}
      />

      {/* Gasolina em valor */}
      <input
        className="input"
        type="number"
        placeholder="Valor da gasolina (R$)"
        value={gasolina}
        onChange={(e) => setGasolina(e.target.value)}
      />

      {/* Como chegou na loja */}
      <select
        className="input"
        value={chegada}
        onChange={(e) => setChegada(e.target.value)}
      >
        <option value="WHATSAPP">WhatsApp</option>
        <option value="PESSOALMENTE">Pessoalmente</option>
        <option value="TENDA">Tenda</option>
        <option value="INDICACAO">Indicação</option>
        <option value="OUTROS">Outros</option>
      </select>

      {/* Forma de pagamento descritiva */}
      <input
        className="input"
        type="text"
        placeholder="Forma de pagamento (ex: Pix 500 + Crédito 3x)"
        value={formaPagamento}
        onChange={(e) => setFormaPagamento(e.target.value)}
      />

      {/* Capacete brinde */}
      <select
        className="input"
        value={capaceteBrinde}
        onChange={(e) => setCapaceteBrinde(e.target.value)}
      >
        <option value="SIM">Capacete de brinde (SIM)</option>
        <option value="NAO">Sem capacete</option>
      </select>

      <button className="btn-vender" onClick={venderMoto}>
        Confirmar Venda
      </button>
    </div>
  );
}
