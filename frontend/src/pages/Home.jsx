/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Home.css";

export default function Home() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pecas");

  const [pecas, setPecas] = useState([]);
  const [motos, setMotos] = useState([]);

  const [busca, setBusca] = useState("");

  /* ======== MODAL VENDA MOTO ======== */
  const [motoSelecionada, setMotoSelecionada] = useState(null);
  const [clienteNome, setClienteNome] = useState("");
  const [valorMoto, setValorMoto] = useState("");
  const [brinde, setBrinde] = useState(false);
  const [gasolina, setGasolina] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [comoChegou, setComoChegou] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const data = JSON.parse(raw);
    if (!data?.role || !data?.filial) return nav("/");

    setUser(data);

    api.get("/pecas").then(res => setPecas(res.data || []));
    api.get("/motos").then(res => setMotos(res.data || []));
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  /* ================= CARRINHO PEÇAS ================= */
  function adicionarCarrinho(peca) {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const existente = carrinho.find(i => i.peca_id === peca.id);

    if (existente) existente.quantidade += 1;
    else {
      carrinho.push({
        peca_id: peca.id,
        nome: peca.nome,
        quantidade: 1,
        preco_unitario: Number(peca.preco) || 0
      });
    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    alert("Peça adicionada ao carrinho!");
  }

  /* ================= VENDA MOTO ================= */
  function abrirVendaMoto(moto) {
    setMotoSelecionada(moto);
    setClienteNome("");
    setValorMoto("");
    setBrinde(false);
    setGasolina(false);
    setFormaPagamento("");
    setComoChegou("");
  }

  async function confirmarVendaMoto() {
    if (!clienteNome || !valorMoto) {
      alert("Informe nome do cliente e valor");
      return;
    }

    try {
      await api.post("/vender-moto", {
        moto_id: motoSelecionada.id,
        cliente_nome: clienteNome,
        valor: valorMoto,
        brinde,
        gasolina,
        forma_pagamento: formaPagamento,
        como_chegou: comoChegou
      });

      setMotos(prev =>
        prev.map(m =>
          m.id === motoSelecionada.id
            ? { ...m, status: "VENDIDA" }
            : m
        )
      );

      setMotoSelecionada(null);
      alert("Moto vendida com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao vender moto");
    }
  }

  if (!user) return null;

  return (
    <div className="home-container">
      {/* HEADER */}
      <div className="home-header">
        <h2>MotoNow • Gestão — {user.filial}</h2>
        <button onClick={sair}>Sair</button>
      </div>

      {/* TABS */}
<div className="tabs">
  <button onClick={() => setTab("pecas")}>📦 Peças</button>
  <button onClick={() => setTab("motos")}>🏍 Motos</button>

  <button onClick={() => nav("/vendas")}>
    🧾 Vendas (Peças)
  </button>

  <button onClick={() => nav("/vendas-motos")}>
    🏍 Histórico Motos
  </button>

  <button onClick={() => nav("/carrinho")}>
    🛒 Carrinho
  </button>
</div>


      {/* PEÇAS */}
      {tab === "pecas" && (
        <>
          <input
            placeholder="Buscar peça..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qtd</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pecas
                .filter(p =>
                  p.nome.toLowerCase().includes(busca.toLowerCase())
                )
                .map(p => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.estoque}</td>
                    <td>R$ {Number(p.preco).toFixed(2)}</td>
                    <td>
                      <button onClick={() => adicionarCarrinho(p)}>
                        🛒
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {/* MOTOS */}
      {tab === "motos" && (
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Filial</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {motos.map(m => (
              <tr key={m.id}>
                <td>{m.modelo}</td>
                <td>{m.cor}</td>
                <td>{m.chassi}</td>
                <td>{m.filial}</td>
                <td>{m.status}</td>
                <td>
                  {m.status === "DISPONIVEL" && (
                    <button onClick={() => abrirVendaMoto(m)}>
                      Vender
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* MODAL VENDA MOTO */}
      {motoSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Venda da Moto</h3>

            <input placeholder="Nome do cliente" value={clienteNome}
              onChange={e => setClienteNome(e.target.value)} />

            <input placeholder="Valor" type="number" value={valorMoto}
              onChange={e => setValorMoto(e.target.value)} />

            <label>
              <input type="checkbox" checked={brinde}
                onChange={e => setBrinde(e.target.checked)} /> Brinde
            </label>

            <label>
              <input type="checkbox" checked={gasolina}
                onChange={e => setGasolina(e.target.checked)} /> Gasolina
            </label>

            <input placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)} />

            <input placeholder="Como chegou?"
              value={comoChegou}
              onChange={e => setComoChegou(e.target.value)} />

            <button onClick={confirmarVendaMoto}>Confirmar</button>
            <button onClick={() => setMotoSelecionada(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
