import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function VendaPeca() {
  const { id } = useParams();
  const nav = useNavigate();

  const API = "http://192.168.1.24:5000"; // 🔥 AGORA FUNCIONA NA REDE

  const [peca, setPeca] = useState(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    axios
      .get(`${API}/pecas`, {
        params: {
          role: user.role,
          filial: user.filial
        }
      })
      .then((res) => {
        const encontrada = res.data.find((p) => p.id === Number(id));
        setPeca(encontrada);
      })
      .catch(() => alert("Erro ao carregar peça!"));
  }, [API, id, user.role, user.filial]);

  if (!peca) {
    return <h2 style={{ padding: 30 }}>Carregando informações...</h2>;
  }

  const total = quantidade * precoUnitario;

  async function confirmarVenda() {
    try {
      const response = await axios.post(`${API}/vendas`, {
        peca_id: peca.id,
        nome_cliente: nomeCliente,
        telefone,
        cpf,
        quantidade,
        preco_unitario: precoUnitario,
        filial: user.filial
      });

      localStorage.setItem("notaFiscal", JSON.stringify(response.data.venda));
      nav("/nota");
    } catch (err) {
      alert("Erro ao confirmar venda!");
      console.error(err);
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Vender Peça</h2>

      <p><b>Peça:</b> {peca.nome}</p>
      <p><b>Código:</b> {peca.codigo}</p>
      <p><b>Estoque disponível:</b> {peca.quantidade}</p>

      <hr />

      <h3>Dados do Cliente</h3>

      <input placeholder="Nome do cliente"
        onChange={(e) => setNomeCliente(e.target.value)} /><br /><br />

      <input placeholder="Telefone"
        onChange={(e) => setTelefone(e.target.value)} /><br /><br />

      <input placeholder="CPF"
        onChange={(e) => setCpf(e.target.value)} /><br /><br />

      <h3>Venda</h3>

      <input type="number" placeholder="Quantidade"
        value={quantidade}
        onChange={(e) => setQuantidade(Number(e.target.value))} /><br /><br />

      <input type="number" placeholder="Preço unitário"
        onChange={(e) => setPrecoUnitario(Number(e.target.value))} /><br /><br />

      <h3>Total: R$ {total.toFixed(2)}</h3>

      <button onClick={confirmarVenda} style={{ padding: 10, marginTop: 20 }}>
        Confirmar Venda
      </button>
    </div>
  );
}
