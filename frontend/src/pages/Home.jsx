import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api"; // 🔥 usando o axios com baseURL do Railway
import "./Home.css";

export default function Home() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pecas");
  const [pecas, setPecas] = useState([]);
  const [motos, setMotos] = useState([]);
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
        params: { role: data.role, filial: data.filial }
      })
      .then((res) => setPecas(res.data))
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar peças!");
      });

    // 🔥 Carregar motos
    api
      .get("/motos", {
        params: { role: data.role, filial: data.filial }
      })
      .then((res) => setMotos(res.data))
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar motos!");
      });
      
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  // 🔍 FILTRO DE PEÇAS
  const pecasFiltradas = pecas.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busca.toLowerCase())
  );

  return user ? (
    <div className="home-container">

      {/* HEADER */}
      <div className="home-header">
        <img src="/logo-shineray.png" alt="Shineray MotoNow" className="logo-mini" />
        <h2>MotoNow • Gestão — {user.filial}</h2>

        {/* BOTÃO DO CARRINHO */}
        <button className="add-btn" onClick={() => nav("/carrinho")}>
          🛒 Carrinho
        </button>

        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab-btn ${tab === "pecas" ? "active" : ""}`} onClick={() => setTab("pecas")}>
          📦 Peças
        </button>

        <button className={`tab-btn ${tab === "motos" ? "active" : ""}`} onClick={() => setTab("motos")}>
          🏍 Motos
        </button>

        <button className={`tab-btn ${tab === "vendas" ? "active" : ""}`} onClick={() => nav("/vendas")}>
          🧾 Vendas
        </button>

        <button className={`tab-btn ${tab === "revisoes" ? "active" : ""}`} onClick={() => setTab("revisoes")}>
          🛠 Revisões
        </button>
      </div>

      {/* CONTEÚDO */}
      <div>

        {/* PEÇAS */}
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
                      <td>{p.codigo}</td>
                      <td>{p.quantidade}</td>
                      <td>{p.filial_atual}</td>
                      <td>
                        {/* BOTÃO PARA ADICIONAR AO CARRINHO */}
                        <button className="action-btn" onClick={() => nav(`/add-carrinho/${p.id}`)}>
                          ➕ Carrinho
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MOTOS */}
        {tab === "motos" && (
          <>
            <h3 className="section-title">🏍 Estoque de Motos</h3>

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
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>
                  {motos.map((m) => (
                    <tr key={m.id}>
                      <td>{m.modelo}</td>
                      <td>{m.ano}</td>
                      <td>{m.cor}</td>
                      <td>{m.chassi}</td>
                      <td>{m.filial}</td>
                      <td>{m.status || "—"}</td>
                      <td>
                        <button className="action-btn" onClick={() => nav(`/revisao-moto/${m.id}`)}>
                          Revisão
                        </button>

                        {user.role === "Diretoria" && (
                          <button className="action-btn" onClick={() => nav(`/transferir-moto/${m.id}`)}>
                            Transferir
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

        {/* REVISÕES */}
        {tab === "revisoes" && (
          <h3 className="section-title">🛠 Revisões — Em Breve</h3>
        )}
      </div>
    </div>
  ) : null;
}
