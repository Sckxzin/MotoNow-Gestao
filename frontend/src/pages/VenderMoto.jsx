import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "./VenderMoto.css";

export default function VenderMoto() {
  const { id } = useParams();
  const nav = useNavigate();

  const [moto, setMoto] = useState(null);
  const [loading, setLoading] = useState(true);

  // Campos do formulário
  const [valor, setValor] = useState("");
  const [gasolina, setGasolina] = useState("");
  const [capaceteBrinde, setCapaceteBrinde] = useState("NÃO");
  const [chegada, setChegada] = useState("WHATSAPP");
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  useEffect(() => {
    api
      .get(`/moto/${id}`)
      .then((res) => {
        setMoto(res.data);
        setLoading(false);
      })
      .catch(() => {
        alert("Moto não encontrada!");
        nav("/home");
      });
  }, [id, nav]);

  function finalizarVenda() {
    if (!valor || !nomeCliente || !telefone || !cpf) {
      return alert("Preencha todos os campos obrigatórios!");
    }

    api
      .post("/vender-moto", {
        moto_id: id,
        nome_cliente: nomeCliente,
        telefone,
        cpf,
        filial: moto.filial,
        gasolina,
        valor,
        capacete_brinde: capaceteBrinde,
        chegada,
      })
      .then((res) => {
        alert("Venda registrada com sucesso!");
        nav("/home");
      })
      .catch((err) => {
        console.error(err);
        alert("Erro ao registrar venda!");
      });
  }

  if (loading) return <h3>Carregando dados da moto...</h3>;

  return (
    <div className="vender-container">
      <div className="card-venda">

        <h2>Venda de Moto</h2>

        <p><strong>Modelo:</strong> {moto.modelo}</p>
        <p><strong>Cor:</strong> {moto.cor}</p>
        <p><strong>Chassi:</strong> {moto.chassi}</p>
        <p><strong>Filial:</strong> {moto.filial}</p>

        <h3>Dados da Venda</h3>

        {/* VALOR */}
        <input
          type="number"
          className="input"
          placeholder="Valor da Moto (R$)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />

        {/* GASOLINA */}
        <input
          type="number"
          className="input"
          placeholder="Valor de gasolina (R$)"
          value={gasolina}
          onChange={(e) => setGasolina(e.target.value)}
        />

        {/* CAPACETE BRINDE */}
        <select
          className="input"
          value={capaceteBrinde}
          onChange={(e) => setCapaceteBrinde(e.target.value)}
        >
          <option value="SIM">Capacete de brinde: SIM</option>
          <option value="NÃO">Capacete de brinde: NÃO</option>
        </select>

        {/* COMO CHEGOU */}
        <select
          className="input"
          value={chegada}
          onChange={(e) => setChegada(e.target.value)}
        >
          <option value="WHATSAPP">Como chegou: WhatsApp</option>
          <option value="PESSOALMENTE">Como chegou: Pessoalmente</option>
          <option value="TENDA">Como chegou: Tenda</option>
          <option value="INDICACAO">Como chegou: Indicação</option>
          <option value="OUTRO">Como chegou: Outro</option>
        </select>

        <h3>Dados do Cliente</h3>

        <input
          type="text"
          className="input"
          placeholder="Nome do cliente"
          value={nomeCliente}
          onChange={(e) => setNomeCliente(e.target.value)}
        />

        <input
          type="text"
          className="input"
          placeholder="Telefone"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
        />

        <input
          type="text"
          className="input"
          placeholder="CPF"
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />

        <button className="btn-vender" onClick={finalizarVenda}>
          Finalizar Venda
        </button>
      </div>
    </div>
  );
}
