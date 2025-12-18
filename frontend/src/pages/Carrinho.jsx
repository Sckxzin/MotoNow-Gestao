import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const navigate = useNavigate();

  const [itens, setItens] = useState([]);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");

  const [formaPagamento, setFormaPagamento] = useState("Pix");

  const [isRevisao, setIsRevisao] = useState(false);
  const [modeloMoto, setModeloMoto] = useState("");
  const [chassi, setChassi] = useState("");

  /* ================= CARREGA CARRINHO ================= */
  useEffect(() => {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    setItens(carrinho);
  }, []);

  /* ================= ATUALIZA CARRINHO ================= */
  function atualizarCarrinho(novo) {
    setItens(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
  }

  /* ================= ALTERAR QTD ================= */
  function alterarQtd(index, valor) {
    const novo = [...itens];
    novo[index].quantidade = Number(valor);
    atualizarCarrinho(novo);
  }

  /* ================= ALTERAR PREÇO ================= */
  function alterarPreco(index, valor) {
    const novo = [...itens];
    novo[index].preco_unitario = Number(valor);
    atualizarCarrinho(novo);
  }

  /* ================= REMOVER ================= */
  function removerItem(index) {
    const novo = itens.filter((_, i) => i !== index);
    atualizarCarrinho(novo);
  }

  /* ================= TOTAL ================= */
  const total = itens.reduce(
    (soma, item) => soma + item.quantidade * item.preco_unitario,
    0
  );

  /* ================= FINALIZAR VENDA ================= */
  async function finalizarVenda() {
    if (itens.length === 0) {
      alert("Carrinho vazio");
      return;
    }

    if (!nome) {
      alert("Informe o nome do cliente");
      return;
    }

    if (isRevisao && (!modeloMoto || !chassi)) {
      alert("Informe o modelo da moto e o chassi");
      return;
    }

    const payload = {
      cliente: {
        nome,
        telefone,
        cpf
      },
      filial: localStorage.getItem("filial"),
      forma_pagamento: formaPagamento,
      itens: itens.map(item => ({
        peca_id: item.id, // ⚠️ TEM que existir
        quantidade: Number(item.quantidade),
        preco_unitario: Number(item.preco_unitario)
      }))
    };

    console.log("PAYLOAD FINAL:", payload);

    try {
      await api.post("/venda-multipla", payload);
      localStorage.removeItem("carrinho");
      alert("Venda finalizada com sucesso!");
      navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar venda");
    }
  }

  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Vendas</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Peça</th>
            <th>Código</th>
            <th>Qtd</th>
            <th>Preço</th>
            <th>Subtotal</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, index) => (
            <tr key={index}>
              <td>{item.nome}</td>
              <td>{item.codigo}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={e => alterarQtd(index, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.preco_unitario}
                  onChange={e => alterarPreco(index, e.target.value)}
                />
              </td>
              <td>
                R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
              </td>
              <td>
                <button onClick={() => removerItem(index)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Total Geral: R$ {total.toFixed(2)}</h3>

      <h3>Dados do Cliente</h3>
      <input
        placeholder="Nome"
        value={nome}
        onChange={e => setNome(e.target.value)}
      />
      <input
        placeholder="Telefone"
        value={telefone}
        onChange={e => setTelefone(e.target.value)}
      />
      <input
        placeholder="CPF"
        value={cpf}
        onChange={e => setCpf(e.target.value)}
      />

      <h3>Revisão?</h3>
      <select
        value={isRevisao ? "sim" : "nao"}
        onChange={e => setIsRevisao(e.target.value === "sim")}
      >
        <option value="nao">Não</option>
        <option value="sim">Sim</option>
      </select>

      {isRevisao && (
        <>
          <input
            placeholder="Modelo da Moto"
            value={modeloMoto}
            onChange={e => setModeloMoto(e.target.value)}
          />
          <input
            placeholder="Chassi"
            value={chassi}
            onChange={e => setChassi(e.target.value)}
          />
        </>
      )}

      <h3>Forma de Pagamento</h3>
      <select
        value={formaPagamento}
        onChange={e => setFormaPagamento(e.target.value)}
      >
        <option>Pix</option>
        <option>Dinheiro</option>
        <option>Cartão</option>
        <option>Transferência</option>
      </select>

      <br /><br />

      <button className="btn-finalizar" onClick={finalizarVenda}>
        ✅ Finalizar Venda
      </button>
    </div>
  );
}
