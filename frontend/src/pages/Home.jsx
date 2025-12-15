/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Home.css";

/* ----------------------------------------
   🧠 INTELIGÊNCIA – DETECTAR MODELO DA PEÇA
------------------------------------------- */
function detectarModelo(nome, codigo) {
  const n = nome.toUpperCase();
  const c = (codigo || "").toUpperCase();

  // 1️⃣ Detectar pelo CÓDIGO → mais preciso
  if (c.startsWith("W175SHI") || c.includes("SHI")) return "SHI";
  if (c.includes("SH")) return "SH";

  if (c.includes("JET50") || c.includes("J50")) return "JET 50";
  if (c.includes("JET125") || c.includes("J125")) return "JET 125";
  if (c.includes("125SS") || c.includes("JET125SS")) return "JET 125SS";
  if (c.includes("JET150") || c.includes("J150")) return "JET 150";

  if (c.includes("PHX") || c.includes("PHOENIX")) return "PHOENIX";
  if (c.includes("PT50") || c.includes("PT 50")) return "PT 50";
  if (c.includes("PT125") || c.includes("PTS")) return "PT 125";

  // Genéricos
  if (c.includes("144015750") || c.includes("ÓLEO") || c.includes("OLEO")) return "GENÉRICO";
  if (c.includes("00000000")) return "GENÉRICO";

  // 2️⃣ Detectar pelo NOME
  if (n.includes("JET 50") || n.includes("JET50") || n.includes("J50")) return "JET 50";
  if (n.includes("JET 125") || n.includes("JET125")) return "JET 125";
  if (n.includes("JET 125SS") || n.includes("125SS")) return "JET 125SS";
  if (n.includes("JET 150") || n.includes("JET150")) return "JET 150";

  if (n.includes("PHOENIX") || n.includes("PHX")) return "PHOENIX";
  if (n.includes("PT 50") || n.includes("PT50")) return "PT 50";
  if (n.includes("PT 125") || n.includes("PT125") || n.includes("PTS")) return "PT 125";
  if (n.includes("SHI") || n.includes("SH ")) return "SH";
  if (n.includes("ÓLEO") || n.includes("OLEO")) return "GENÉRICO";
  if (n.includes("CAPACETE")) return "GENÉRICO";

  return "—"; // Sem modelo
}

export default function Home() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pecas");
  const [pecas, setPecas] = useState([]);
  const [motos, setMotos] = useState([]);
  const [filialFiltro, setFilialFiltro] = useState("TODAS");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("user"));

    if (!data) {
      nav("/");
      return;
    }

    setUser(data);

    // 🔥 Carregar peças
    api
      .get("/pecas", {
        params: { role: data.role, filial: data.filial },
      })
      .then((response) => setPecas(response.data))
      .catch(() => alert("Erro ao carregar peças!"));

    // 🔥 Carregar motos
    api
      .get("/motos", {
        params: { role: data.role, filial: data.filial },
      })
      .then((response) => setMotos(response.data))
      .catch(() => alert("Erro ao carregar motos!"));
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  // 🔍 FILTRO DE PEÇAS POR BUSCA
  const pecasFiltradas = pecas.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  // 🔍 FILTRO DE MOTOS POR FILIAL
  const motosFiltradas = motos.filter((m) =>
    filialFiltro === "TODAS" ? true : m.filial === filialFiltro
  );

  return user ? (
    <div className="home-container">
      {/* HEADER */}
      <div className="home-header">
        <img
          src="/logo-shineray.png"
          alt="Shineray MotoNow"
          className="logo-mini"
        />
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

        <button
          className={`tab-btn ${tab === "revisoes" ? "active" : ""}`}
          onClick={() => nav("/revisoes")}
        >
          🛠 Revisões
        </button>
      </div>

      {/* CONTEÚDO */}
      <div>
        {/* ==============================
             PEÇAS
        ============================== */}
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
              <button
                className="add-btn"
                onClick={() => nav("/cadastro-peca")}
              >
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

                      {/* 🔥 MODELO AUTOMÁTICO */}
                      <td>{detectarModelo(p.nome, p.codigo)}</td>

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

        {/* ==============================
             MOTOS
        ============================== */}
        {tab === "motos" && (
          <>
            <h3 className="section-title">🏍 Estoque de Motos</h3>

            {/* Total */}
            <p className="contador-motos">
              🔢 Total de motos cadastradas: <strong>{motosFiltradas.length}</strong>
            </p>

            {/* Filtro por filial */}
            <select
              className="input-busca"
              value={filialFiltro}
              onChange={(e) => setFilialFiltro(e.target.value)}
            >
              <option value="TODAS">Todas as filiais</option>
              <option value="Ipojuca">Ipojuca</option>
              <option value="Escada">Escada</option>
              <option value="Ribeirão">Ribeirão</option>
              <option value="São José">São José</option>
              <option value="Catende">Catende</option>
            </select>

            {user.role === "Diretoria" && (
              <button
                className="add-btn"
                onClick={() => nav("/cadastro-moto")}
              >
                ➕ Cadastrar Moto
              </button>
            )}

            {/* Tabela motos */}
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Modelo</th>
                    <th>Ano</th>
                    <th>Cor</th>
                    <th>Chassi</th>
                    <th>Filial</th>
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
                      <td>{m.status || "—"}</td>

                      <td>
                        <button
                          className="action-btn"
                          onClick={() => nav(`/revisao-moto/${m.id}`)}
                        >
                          Revisão
                        </button>

                        {user.role === "Diretoria" && (
                          <>
                            <button
                              className="action-btn"
                              onClick={() => nav(`/transferir-moto/${m.id}`)}
                            >
                              Transferir
                            </button>

                            <button
                              className="action-btn"
                              onClick={() => nav(`/vender-moto/${m.id}`)}
                            >
                              Vender
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ==============================
             REVISÕES
        ============================== */}
        {tab === "revisoes" && (
          <h3 className="section-title">🛠 Revisões — Acessar página dedicada</h3>
        )}
      </div>
    </div>
  ) : null;
}
