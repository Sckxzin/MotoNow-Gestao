import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [itens, setItens] = useState([]);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");

  const [isRevisao, setIsRevisao] = useState(false);
  const [modeloMoto, setModeloMoto] = useState("");
  const [chassi, setChassi] = useState("");

  /* ================= LOAD CARRINHO ================= */
  useEffect(() => {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    setItens(carrinho);
  }, []);

  function atualizarCarrinho(novo) {
    setItens(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
  }

  function alterarQtd(index, qtd) {
    const novo = [...itens];
    novo[index].quantidade = Number(qtd);
    atualizarCarrinho(novo);
  }

  function alterarPreco(index, preco) {
    const novo = [...itens];
    novo[index].preco_unitario = Number(preco);
    atualizarCarrinho(novo);
  }

  function remover(index) {
    atualizarCarrinho(itens.filter((_, i) => i !== index));
  }

  const total = itens.reduce(
    (s, i) => s + i.quantidade * i.preco_unitario,
    0
  );

  async function finalizarVenda() {
    if (itens.length === 0) return alert("Carrinho vazio");
    if (!nome) return alert("Informe o nome do cliente");

    if (isRevisao && (!modeloMoto || !chassi)) {
      return alert("Informe modelo e chassi da moto");
    }

    const payload = {
      cliente: { nome, telefone, cpf },
      filial: "Escada",
      forma_pagamento: formaPagamento,
      revisao: isRevisao,
      modelo_moto: isRevisao ? modeloMoto : null,
      chassi: isRevisao ? chassi : null,
      itens
    };

    try {
      await api.post("/venda-multipla", payload);
      localStorage.removeItem("carrinho");
      alert("Venda finalizada com sucesso!");
      nav("/home");
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
          {itens.map((i, index) => (
            <tr key={index}>
              <td>{i.nome}</td>
              <td>{i.codigo}</td>
              <td>
                <input
                  type="number"
                  min="1"
                  value={i.quantidade}
                  onChange={e => alterarQtd(index, e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={i.preco_unitario}
                  onChange={e => alterarPreco(index, e.target.value)}
                />
              </td>
              <td>R$ {(i.quantidade * i.preco_unitario).toFixed(2)}</td>
              <td>
                <button onClick={() => remover(index)}>❌</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Total Geral: R$ {total.toFixed(2)}</h3>

      <h3>Dados do Cliente</h3>
      <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} />
      <input placeholder="Telefone" value={telefone} onChange={e => setTelefone(e.target.value)} />
      <input placeholder="CPF" value={cpf} onChange={e => setCpf(e.target.value)} />

      <h3>Revisão?</h3>
      <select value={isRevisao ? "sim" : "nao"} onChange={e => setIsRevisao(e.target.value === "sim")}>
        <option value="nao">Não</option>
        <option value="sim">Sim</option>
      </select>

      {isRevisao && (
        <>
          <input placeholder="Modelo da Moto" value={modeloMoto} onChange={e => setModeloMoto(e.target.value)} />
          <input placeholder="Chassi" value={chassi} onChange={e => setChassi(e.target.value)} />
        </>
      )}

      <h3>Forma de Pagamento</h3>
      <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
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
