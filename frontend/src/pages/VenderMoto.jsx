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
    cpf: "",
  });

  const [gasolina, setGasolina] = useState("");
  const [valor, setValor] = useState("");
  const [capacete, setCapacete] = useState("SIM");
  const [chegada, setChegada] = useState("");

  useEffect(() => {
    api.get(`/moto/${id}`)
      .then(res => setMoto(res.data))
      .catch(() => {
        alert("Moto não encontrada!");
        nav("/home");
      });
  }, [id, nav]);

  function finalizarVenda() {
    if (!cliente.nome || !cliente.telefone || !cliente.cpf) {
      alert("Preencha todos os dados do cliente.");
      return;
    }

    api.post("/vender-moto", {
      moto_id: id,
      nome_cliente: cliente.nome,
      telefone: cliente.telefone,
      cpf: cliente.cpf,
      filial: moto.filial,
      gasolina,
      valor,
      capacete_brinde: capacete,
      chegada
    })
    .then(() => {
      alert("Venda registrada com sucesso!");
      nav("/home");
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao registrar venda.");
    });
  }

  if (!moto) return <h3>Carregando dados da moto...</h3>;

  return (
    <div className="venda-moto-container">
      <div className="venda-card">

        <h2>Venda de Moto</h2>

        <p><b>Modelo:</b> {moto.modelo}</p>
        <p><b>Cor:</b> {moto.cor}</p>
        <p><b>Chassi:</b> {moto.chassi}</p>
        <p><b>Filial:</b> {moto.filial}</p>

        <h3>Detalhes da Venda</h3>

        <input placeholder="Litros / Gasolina" 
               value={gasolina} 
               onChange={(e) => setGasolina(e.target.value)} />

        <input placeholder="Valor da moto (R$)" 
               type="number"
               value={valor} 
               onChange={(e) => setValor(e.target.value)} />

        <select value={capacete} onChange={(e) => setCapacete(e.target.value)}>
          <option value="SIM">Capacete de Brinde: SIM</option>
          <option value="NÃO">Capacete de Brinde: NÃO</option>
        </select>

        <select value={chegada} onChange={(e) => setChegada(e.target.value)}>
          <option value="">Como chegou na loja?</option>
          <option value="TRANSPORTADORA">Transportadora</option>
          <option value="CARRETA">Carreta</option>
          <option value="ENVIO INTERNO">Envio interno</option>
          <option value="OUTRO">Outro</option>
        </select>

        <h3>Dados do Cliente</h3>

        <input placeholder="Nome do cliente"
               value={cliente.nome}
               onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} />

        <input placeholder="Telefone"
               value={cliente.telefone}
               onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} />

        <input placeholder="CPF"
               value={cliente.cpf}
               onChange={(e) => setCliente({ ...cliente, cpf: e.target.value })} />

        <button className="btn-finalizar" onClick={finalizarVenda}>
          Finalizar Venda
        </button>

      </div>
    </div>
  );
}
