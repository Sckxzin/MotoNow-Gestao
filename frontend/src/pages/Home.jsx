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
  const [filialFiltro, setFilialFiltro] = useState("TODAS");

  /* ================= LOAD SEGURO ================= */
  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (!raw) {
      nav("/");
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      localStorage.clear();
      nav("/");
      return;
    }

    if (!data?.role || !data?.filial) {
      localStorage.clear();
      nav("/");
      return;
    }

    setUser(data);

   api
  .get("/pecas", {
    params: {
      cidade: data.filial
    }
  })
  .then(res => setPecas(res.data || []))
  .catch(() => setPecas([]));


    /* 🔥 MOTOS */
    api
      .get("/motos")
      .then(res => setMotos(res.data || []))
      .catch(() => setMotos([]));

  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  /* ================= FILTROS ================= */
  const pecasFiltradas = pecas.filter(p =>
    (p.nome || "").toLowerCase().includes(busca.toLowerCase())
  );

  const motosFiltradas = motos.filter(m =>
    filialFiltro === "TODAS" ? true : m.filial === filialFiltro
  );

  /* ================= CARRINHO ================= */
  function adicionarCarrinho(peca) {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    const existente = carrinho.find(i => i.peca_id === peca.id);

    if (existente) {
      existente.quantidade += 1;
    } else {
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

  if (!user) return null;
  async function venderMoto(id) {
  if (!window.confirm("Confirmar venda da moto?")) return;

  try {
    await api.post("/vender-moto", { moto_id: id });

    // atualizar status local
    setMotos(prev =>
      prev.map(m =>
        m.id === id ? { ...m, status: "VENDIDA" } : m
      )
    );

    alert("Moto vendida com sucesso!");
  } catch (err) {
    console.error(err);
    alert("Erro ao vender moto");
  }
}


  return (
    <div className="home-container">

      {/* ================= HEADER ================= */}
      <div className="home-header">
        <img src="/logo-shineray.png" alt="Shineray" className="logo-mini" />
        <h2>MotoNow • Gestão — {user.filial}</h2>
        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>

      {/* ================= TABS ================= */}
      <div className="tabs">
        <button
          className={`tab-btn ${tab === "pecas" ? "active" : ""}`}
          onClick={() => setTab("pecas")}
        >
          📦 Peças
        </button>

        <button
          className={`tab-btn ${tab === "motos" ? "active" : ""}`}
          onClick={() => setTab("motos")}
        >
          🏍 Motos
        </button>

        <button className="tab-btn" onClick={() => nav("/vendas")}>
          🧾 Vendas
        </button>

        <button className="tab-btn" onClick={() => nav("/carrinho")}>
          🛒 Carrinho
        </button>
      </div>

      {/* ================= PEÇAS ================= */}
      {tab === "pecas" && (
        <>
          <h3 className="section-title">📦 Estoque de Peças</h3>

          <input
            className="input-busca"
            placeholder="Buscar por nome..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          <div className="table-container">
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
                {pecasFiltradas.map(p => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.estoque}</td>
                    <td><strong>R$ {Number(p.preco).toFixed(2)}</strong></td>
                    <td>
                      <button
                        className="action-btn"
                        onClick={() => adicionarCarrinho(p)}
                      >
                        🛒 Carrinho
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ================= MOTOS ================= */}
      {tab === "motos" && (
  <>
    <h3 className="section-title">🏍 Estoque de Motos</h3>

    <div className="table-container">
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
                  <button
                    className="action-btn"
                    onClick={() => venderMoto(m.id)}
                  >
                    Vender
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
)}

