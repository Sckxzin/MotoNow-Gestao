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

  // 🔥 NOVO: revisão
  const [isRevisao, setIsRevisao] = useState(false);
  const [revisao, setRevisao] = useState({
    modelo_moto: "",
    chassi: ""
  });

  const [formaPagamento, setFormaPagamento] = useState("Pix");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem("carrinho")) || [];
    setCarrinho(c);
  }, []);

  function atualizarCarrinho(novo) {
    setCarrinho(novo);
    localStorage.setItem("carrinho", JSON.stringify(novo));
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
    (s, i) => s + i.quantidade * i.preco_unitario,
    0
  );

  async function finalizarVenda() {
    if (!cliente.nome || !cliente.cpf) {
      return alert("Preencha os dados do cliente");
    }

    if (isRevisao && (!revisao.modelo_moto || !revisao.chassi)) {
      return alert("Preencha modelo e chassi da moto");
    }

    try {
      const payload = {
        cliente,
        filial: user.filial,
        forma_pagamento: formaPagamento,
        revisao: isRevisao ? revisao : null,
        itens: carrinho.map(item => ({
          peca_id: item.peca_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        }))
      };

      const res = await api.post("/venda-multipla", payload);

      // 🧾 Nota fiscal (local)
      const nota = {
        cliente,
        filial: user.filial,
        forma_pagamento: formaPagamento,
        revisao: isRevisao ? revisao : null,
        total: totalGeral,
        data: new Date().toLocaleString(),
        itens: carrinho
      };

      localStorage.setItem("notaFiscal", JSON.stringify(nota));
      localStorage.removeItem("carrinho");

      nav("/nota");
    } catch (err) {
      console.error(err);
      alert("Erro ao finalizar venda");
    }
  }

  return (
    <div className="carrinho-container">
      <h2>🛒 Carrinho de Vendas</h2>

      {carrinho.length === 0 ? (
        <h3>Carrinho vazio</h3>
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
                      min="1"
                      value={item.quantidade}
                      onChange={e =>
                        alterarQuantidade(i, e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.preco_unitario}
                      onChange={e =>
                        alterarPreco(i, e.target.value)
                      }
                    />
                  </td>
                  <td>
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </td>
                  <td>
                    <button onClick={() => removerItem(i)}>X</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Total Geral: R$ {totalGeral.toFixed(2)}</h3>

          {/* CLIENTE */}
          <div className="cliente-box">
            <h3>Dados do Cliente</h3>
            <input
              placeholder="Nome"
              value={cliente.nome}
              onChange={e =>
                setCliente({ ...cliente, nome: e.target.value })
              }
            />
            <input
              placeholder="Telefone"
              value={cliente.telefone}
              onChange={e =>
                setCliente({ ...cliente, telefone: e.target.value })
              }
            />
            <input
              placeholder="CPF"
              value={cliente.cpf}
              onChange={e =>
                setCliente({ ...cliente, cpf: e.target.value })
              }
            />
          </div>

          {/* REVISÃO */}
          <div className="cliente-box">
            <h3>Revisão</h3>

            <label>
              <input
                type="checkbox"
                checked={isRevisao}
                onChange={e => setIsRevisao(e.target.checked)}
              />{" "}
              Venda referente a revisão
            </label>

            {isRevisao && (
              <>
                <input
                  placeholder="Modelo da moto"
                  value={revisao.modelo_moto}
                  onChange={e =>
                    setRevisao({
                      ...revisao,
                      modelo_moto: e.target.value
                    })
                  }
                />
                <input
                  placeholder="Chassi"
                  value={revisao.chassi}
                  onChange={e =>
                    setRevisao({
                      ...revisao,
                      chassi: e.target.value
                    })
                  }
                />
              </>
            )}
          </div>

          {/* PAGAMENTO */}
          <div className="cliente-box">
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
          </div>

          <button className="btn-finalizar" onClick={finalizarVenda}>
            ✔ Finalizar Venda
          </button>
        </>
      )}
    </div>
  );
}
