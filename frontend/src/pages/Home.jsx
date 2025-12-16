/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Home.css";

// 🔥 Identificar modelo automaticamente
function identificarModelo(codigo) {
  if (!codigo) return "—";

  const c = codigo.toUpperCase();

  if (c.startsWith("W175SHI")) return "SHI";
  if (c.startsWith("RDIV") || c.includes("JET")) return "JET";

  return "OUTROS";
}

export default function Home() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pecas");
  const [pecas, setPecas] = useState([]);
  const [motos, setMotos] = useState([]);
  const [busca, setBusca] = useState("");

  const [filialFiltro, setFilialFiltro] = useState("TODAS");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("user"));

    if (!data) {
      nav("/");
      return;
    }

    setUser(data);

    // 🔥 Carregar peças (respeita filial para não-diretoria)
    api
      .get("/pecas", {
        params: { role: data.role, filial: data.filial },
      })
      .then((response) => setPecas(response.data))
      .catch(() => alert("Erro ao carregar peças!"));

    // 🔥 Carregar todas as motos (SEM RESTRIÇÃO DE FILIAL)
    api
      .get("/motos", { params: { role: data.role, filial: data.filial } })
      .then((response) => setMotos(response.data))
      .catch(() => alert("Erro ao carregar motos!"));
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  // 🔍 FILTRO DE PEÇAS
  const pecasFiltradas = pecas.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  // 🔍 FILTRO DE MOTOS
  const motosFiltradas = motos.filter((m) =>
    filialFiltro === "TODAS" ? true : m.filial === filialFiltro
  );

  return user ? (
    <div className="home-container">
      {/* HEADER */}
      <div className="home-header">
        <img src="/logo-shineray.png" alt="Shineray MotoNow" className="logo-mini" />
        <h2>MotoNow • Gestão — {user.filial}</h2>
        <button className="btn-sair" onClick={sair}>
          Sair
        </button>
      </div>

      {/* TABS */}
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

        <button
          className={`tab-btn ${tab === "vendas" ? "active" : ""}`}
          onClick={() => nav("/vendas")}
        >
          🧾 Vendas
        </button>
      </div>

      {/* CONTEÚDO */}
      <div>
        {/* ==================== PEÇAS ==================== */}
        {tab === "pecas" && (
          <>
            <h3 className="section-title">📦 Estoque de Peças</h3>

            <input
              type="text"
              placeholder="🔍 Buscar peça por nome ou código..."
              className="input-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            {user.role === "Diretoria" && (
              <button className="add-btn" onClick={() => nav("/cadastro-peca")}>
                ➕ Adicionar Peça
              </button>
            )}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Modelo</th>
                    <th>Código</th>
                    <th>Quantidade</th>
                    <th>Filial</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {pecasFiltradas.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>{identificarModelo(p.codigo)}</td>
                      <td>{p.codigo}</td>
                      <td>{p.quantidade}</td>
                      <td>{p.filial_atual}</td>
                      <td>
                        <button
                          className="action-btn"
                          onClick={() => nav(`/vender/${p.id}`)}
                        >
                          Vender / Dar Baixa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==================== MOTOS ==================== */}
        {tab === "motos" && (
          <>
            <h3 className="section-title">🏍 Estoque de Motos</h3>

            {/* 🔢 CONTADOR */}
            <p className="contador-motos">
              🔢 Total de motos cadastradas: <strong>{motosFiltradas.length}</strong>
            </p>

            {/* 🔍 FILTRO POR FILIAL */}
            <select
              className="select-filial"
              value={filialFiltro}
              onChange={(e) => setFilialFiltro(e.target.value)}
            >
              <option value="TODAS">Todas as Filiais</option>
              <option value="Matriz">Matriz</option>
              <option value="Ipojuca">Ipojuca</option>
              <option value="Escada">Escada</option>
              <option value="Ribeirão">Ribeirão</option>
              <option value="Catende">Catende</option>
              <option value="São José">São José</option>
              <option value="Xexéu">Xexéu</option>
            </select>

            {user.role === "Diretoria" && (
              <button className="add-btn" onClick={() => nav("/cadastro-moto")}>
                ➕ Cadastrar Moto
              </button>
            )}

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Ano</th>
                    <th>Cor</th>
                    <th>Chassi</th>
                    <th>Filial</th>
                    <th>Santander</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {motosFiltradas.map((m) => (
                    <tr key={m.id}>
                      <td>{m.modelo}</td>
                      <td>{m.ano}</td>
                      <td>{m.cor}</td>
                      <td>{m.chassi}</td>
                      <td>{m.filial}</td>

                      {/* Santander colorido */}
                      <td className={m.santander === "SIM" ? "santander-sim" : "santander-nao"}>
                        {m.santander || "NÃO"}
                      </td>

                      <td>{m.status || "—"}</td>

                      <td>
                        <button
                          className="action-btn"
                          onClick={() => nav(`/vender-moto/${m.id}`)}
                        >
                          Vender
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  ) : null;
}
