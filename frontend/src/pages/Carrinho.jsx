import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Carrinho.css";

export default function Carrinho() {
  const nav = useNavigate();

  const [carrinho, setCarrinho] = useState([]);
  const [cliente, setCliente] = useState({
    nome: "",
    telefone: "",
    cpf: ""
  });

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem("carrinho")) || [];
    setCarrinho(c);
  }, []);

  function atualizarCarrinho(novoCarrinho) {
    setCarrinho(novoCarrinho);
    localStorage.setItem("carrinho", JSON.stringify(novoCarrinho));
  }

  function alterarQuantidade(index, q) {
    const novo = [...carrinho];
    novo[index].quantidade = Number(q);
    atualizarCarrinho(novo);
  }

  function alterarPreco(index, p) {
    const novo = [...carrinho];
    novo[index].preco_unitario = Number(p);
    atualizarCarrinho(novo);
  }

  function removerItem(index) {
    const novo = carrinho.filter((_, i) => i !== index);
    atualizarCarrinho(novo);
  }

  const totalGeral = carrinho.reduce(
    (sum, item) => sum + item.quantidade * item.preco_unitario,
    0
  );

  async function finalizarVenda() {
    if (!cliente.nome || !cliente.cpf) {
      return alert("Preencha o nome e CPF do cliente");
    }

    for (let item of carrinho) {
      if (item.preco_unitario <= 0)
        return alert("Todos os itens precisam ter preço válido.");
    }

    try {
      const res = await api.post("/venda-multipla", {
        cliente,
        filial: user.filial,
        itens: carrinho
      });

      alert("Venda concluída!");

      // 🔥 SALVAR NOTA COMPLETA (ESSENCIAL PARA FUNCIONAR!)
      const notaCompleta = {
        cliente,
        filial: user.filial,
        venda_id: res.data.venda_id,
        total: totalGeral,
        data: new Date().toLocaleString(),
        itens: carrinho.map(item => ({
          nome: item.nome,
          codigo: item.codigo,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.quantidade * item.preco_unitario
        }))
      };

      localStorage.setItem("notaFiscal", JSON.stringify(notaCompleta));

      // Limpar carrinho após salvar nota
      localStorage.removeItem("carrinho");

      nav("/nota"); // abrir nota fiscal

    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar venda.");
    }
  }

  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Vendas</h2>

      {carrinho.length === 0 ? (
        <h3 style={{ marginTop: 30 }}>Carrinho vazio.</h3>
      ) : (
        <>
          <table className="carrinho-table">
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
              {carrinho.map((item, i) => (
                <tr key={i}>
                  <td>{item.nome}</td>
                  <td>{item.codigo}</td>

                  <td>
                    <input
                      type="number"
                      value={item.quantidade}
                      onChange={(e) => alterarQuantidade(i, e.target.value)}
                      className="input-qtd"
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      value={item.preco_unitario}
                      onChange={(e) => alterarPreco(i, e.target.value)}
                      className="input-preco"
                    />
                  </td>

                  <td>
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </td>

                  <td>
                    <button
                      className="btn-remover"
                      onClick={() => removerItem(i)}
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="total-final">
            Total Geral: <strong>R$ {totalGeral.toFixed(2)}</strong>
          </h2>

          <div className="cliente-box">
            <h3>Dados do Cliente</h3>

            <input
              placeholder="Nome"
              value={cliente.nome}
              onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
            />
            <input
              placeholder="Telefone"
              value={cliente.telefone}
              onChange={(e) =>
                setCliente({ ...cliente, telefone: e.target.value })
              }
            />
            <input
              placeholder="CPF"
              value={cliente.cpf}
              onChange={(e) => setCliente({ ...cliente, cpf: e.target.value })}
            />
          </div>

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✔ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
