import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function TransferirPecas() {
  const nav = useNavigate();

  const [pecas, setPecas] = useState([]);
  const [pecaId, setPecaId] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [quantidade, setQuantidade] = useState("");

  useEffect(() => {
    api.get("/pecas").then(res => setPecas(res.data || []));
  }, []);

  async function transferir() {
    if (!pecaId || !origem || !destino || !quantidade) {
      alert("Preencha todos os campos");
      return;
    }

    try {
      await api.post("/transferir-peca", {
        peca_id: Number(pecaId),
        filial_origem: origem,
        filial_destino: destino,
        quantidade: Number(quantidade)
      });

      alert("Transferência realizada com sucesso!");
      nav("/home");

    } catch (err) {
      alert(err.response?.data?.message || "Erro ao transferir");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>🔁 Transferir Peças</h2>

      <button onClick={() => nav("/home")}>⬅ Voltar</button>

      <div style={{ marginTop: 20, maxWidth: 400 }}>
        <select value={pecaId} onChange={e => setPecaId(e.target.value)}>
          <option value="">Selecione a peça</option>
          {pecas.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome} ({p.cidade}) - {p.estoque}
            </option>
          ))}
        </select>

        <select value={origem} onChange={e => setOrigem(e.target.value)}>
          <option value="">Filial origem</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
        </select>

        <select value={destino} onChange={e => setDestino(e.target.value)}>
          <option value="">Filial destino</option>
          <option value="ESCADA">Escada</option>
          <option value="IPOJUCA">Ipojuca</option>
          <option value="RIBEIRAO">Ribeirão</option>
          <option value="SAO JOSE">São José</option>
          <option value="CATENDE">Catende</option>
          <option value="XEXEU">Xexeu</option>
        </select>

        <input
          type="number"
          placeholder="Quantidade"
          value={quantidade}
          onChange={e => setQuantidade(e.target.value)}
        />

        <button onClick={transferir}>Confirmar Transferência</button>
      </div>
    </div>
  );
}