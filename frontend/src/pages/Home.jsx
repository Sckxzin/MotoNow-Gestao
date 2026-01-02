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

  // 🔹 filtros
  const [cidadeFiltroPecas, setCidadeFiltroPecas] = useState("TODAS");
  const [cidadeFiltroMotos, setCidadeFiltroMotos] = useState("TODAS");

  /* ===== MODAL VENDA MOTO ===== */
  const [motoSelecionada, setMotoSelecionada] = useState(null);
  const [clienteNome, setClienteNome] = useState("");
  const [valorMoto, setValorMoto] = useState("");
  const [brinde, setBrinde] = useState(false);
  const [gasolina, setGasolina] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [comoChegou, setComoChegou] = useState("");
  const [filialVenda, setFilialVenda] = useState("");

  /* ===== LOAD ===== */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const data = JSON.parse(raw);
    if (!data?.role || !data?.cidade) return nav("/");

    setUser(data);

    api.get("/pecas", {
      params: {
        role: data.role,
        cidade: data.cidade
      }
    }).then(res => setPecas(res.data || []));

    api.get("/motos").then(res => setMotos(res.data || []));
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  /* ===== RESUMO MOTOS ===== */
  function calcularResumoMotos(lista) {
    const resumo = {};

    lista.forEach(m => {
      if (!resumo[m.filial]) {
        resumo[m.filial] = { disponiveis: 0, vendidas: 0 };
      }

      if (m.status === "DISPONIVEL") resumo[m.filial].disponiveis++;
      if (m.status === "VENDIDA") resumo[m.filial].vendidas++;
    });

    return resumo;
  }

  const resumoMotos = calcularResumoMotos(motos);

  /* ===== CARRINHO PEÇAS ===== */
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

  /* ===== VENDA MOTO ===== */
  function abrirVendaMoto(moto) {
    setMotoSelecionada(moto);
    setClienteNome("");
    setValorMoto("");
    setBrinde(false);
    setGasolina(false);
    setFormaPagamento("");
    setComoChegou("");
    setFilialVenda("");
  }

  async function confirmarVendaMoto() {
    if (!clienteNome || !valorMoto || !filialVenda) {
      alert("Preencha cliente, valor e filial da venda");
      return;
    }

    try {
      await api.post("/vender-moto", {
        moto_id: motoSelecionada.id,
        nome_cliente: clienteNome,
        cpf: "",
        telefone: "",
        valor: Number(valorMoto),
        forma_pagamento: formaPagamento,
        brinde,
        gasolina: gasolina ? Number(gasolina) : null,
        como_chegou: comoChegou,
        filial_venda: filialVenda
      });

      setMotos(prev =>
        prev.map(m =>
          m.id === motoSelecionada.id ? { ...m, status: "VENDIDA" } : m
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
        <h2>MotoNow • Gestão — {user.role}</h2>
        <button onClick={sair}>Sair</button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button onClick={() => setTab("pecas")}>📦 Peças</button>
        <button onClick={() => setTab("motos")}>🏍 Motos</button>
        <button onClick={() => nav("/vendas")}>🧾 Vendas (Peças)</button>
        <button onClick={() => nav("/vendas-motos")}>🏍 Histórico Motos</button>
        <button onClick={() => nav("/carrinho")}>🛒 Carrinho</button>
      </div>

      {/* ===== PEÇAS ===== */}
      {tab === "pecas" && (
        <>
          <input
            placeholder="Buscar peça..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          {user.role === "DIRETORIA" && (
            <select
              value={cidadeFiltroPecas}
              onChange={e => setCidadeFiltroPecas(e.target.value)}
            >
              <option value="TODAS">Todas</option>
              <option value="ESCADA">Escada</option>
              <option value="IPOJUCA">Ipojuca</option>
              <option value="RIBEIRAO">Ribeirão</option>
              <option value="SAO JOSE">São José</option>
              <option value="CATENDE">Catende</option>
            </select>
          )}

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Moto</th>
                <th>Filial</th>
                <th>Qtd</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pecas
                .filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
                .filter(p =>
                  cidadeFiltroPecas === "TODAS"
                    ? true
                    : p.cidade === cidadeFiltroPecas
                )
                .map(p => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td><strong>{p.tipo_moto || "UNIVERSAL"}</strong></td>
                    <td>{p.cidade}</td>
                    <td>{p.estoque}</td>
                    <td>R$ {Number(p.preco).toFixed(2)}</td>
                    <td>
                      <button onClick={() => adicionarCarrinho(p)}>🛒</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {/* ===== MOTOS ===== */}
      {tab === "motos" && (
        <>
          <div className="resumo-motos">
            {Object.entries(resumoMotos).map(([cidade, dados]) => (
              <div key={cidade} className="resumo-card">
                <strong>{cidade}</strong><br />
                🟢 Disponíveis: {dados.disponiveis}<br />
                🔴 Vendidas: {dados.vendidas}
              </div>
            ))}
          </div>

          {user.role === "DIRETORIA" && (
            <select
              value={cidadeFiltroMotos}
              onChange={e => setCidadeFiltroMotos(e.target.value)}
            >
              <option value="TODAS">Todas</option>
              <option value="ESCADA">Escada</option>
              <option value="IPOJUCA">Ipojuca</option>
              <option value="RIBEIRAO">Ribeirão</option>
              <option value="SAO JOSE">São José</option>
              <option value="CATENDE">Catende</option>
            </select>
          )}

          <table className="table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Cor</th>
                <th>Chassi</th>
                <th>Filial</th>
                <th>Santander</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {motos
                .filter(m =>
                  cidadeFiltroMotos === "TODAS"
                    ? true
                    : m.filial === cidadeFiltroMotos
                )
                .map(m => (
                  <tr key={m.id}>
                    <td>{m.modelo}</td>
                    <td>{m.cor}</td>
                    <td>{m.chassi}</td>
                    <td>{m.filial}</td>
                    <td>{m.santander}</td>
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
        </>
      )}

      {/* ===== MODAL VENDA MOTO ===== */}
      {motoSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Venda da Moto</h3>

            <input
              placeholder="Nome do cliente"
              value={clienteNome}
              onChange={e => setClienteNome(e.target.value)}
            />

            <input
              placeholder="Valor"
              type="number"
              value={valorMoto}
              onChange={e => setValorMoto(e.target.value)}
            />

            <select
              value={filialVenda}
              onChange={e => setFilialVenda(e.target.value)}
            >
              <option value="">Selecione a filial da venda</option>
              <option value="ESCADA">ESCADA</option>
              <option value="IPOJUCA">IPOJUCA</option>
              <option value="RIBEIRAO">RIBEIRÃO</option>
              <option value="SAO JOSE">SÃO JOSÉ</option>
              <option value="CATENDE">CATENDE</option>
            </select>

            <label>
              <input
                type="checkbox"
                checked={brinde}
                onChange={e => setBrinde(e.target.checked)}
              /> Brinde
            </label>

            <label>
              <input
                type="number"
                placeholder="Valor da gasolina (opcional)"
                checked={gasolina}
                onChange={e => setGasolina(e.target.value)}
              /> Gasolina
            </label>

            <input
              placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
            />

            <input
              placeholder="Como chegou?"
              value={comoChegou}
              onChange={e => setComoChegou(e.target.value)}
            />

            <button onClick={confirmarVendaMoto}>Confirmar</button>
            <button onClick={() => setMotoSelecionada(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
