  /* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Home.css";

export default function Home() {
  const nav = useNavigate();

  /* ================= STATES ================= */
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("pecas");

  const [pecas, setPecas] = useState([]);
  const [motos, setMotos] = useState([]);

  const [busca, setBusca] = useState("");
  const [cidadeFiltroPecas, setCidadeFiltroPecas] = useState("TODAS");
  const [cidadeFiltroMotos, setCidadeFiltroMotos] = useState("TODAS");
  const [tipoFiltroPecas, setTipoFiltroPecas] = useState("TODOS");

  /* ===== MODAL VENDA MOTO ===== */
  const [motoSelecionada, setMotoSelecionada] = useState(null);
  const [clienteNome, setClienteNome] = useState("");
  const [valorMoto, setValorMoto] = useState("");
  const [brinde, setBrinde] = useState(false);
  const [gasolina, setGasolina] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [filialVenda, setFilialVenda] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const data = JSON.parse(raw);
    if (!data?.role || !data?.cidade) return nav("/");

    setUser(data);

    api.get("/pecas", {
      params: { role: data.role, cidade: data.cidade }
    }).then(res => setPecas(res.data || []));

    api.get("/motos").then(res => setMotos(res.data || []));
  }, [nav]);

  function sair() {
    localStorage.clear();
    nav("/");
  }

  function abrirVendaMoto(moto) {
    setMotoSelecionada(moto);
    setClienteNome("");
    setValorMoto("");
    setBrinde(false);
    setGasolina("");
    setFormaPagamento("");
    setFilialVenda("");
  }

  async function confirmarVendaMoto() {
    if (!clienteNome || !valorMoto || !filialVenda) {
      alert("Preencha cliente, valor e filial");
      return;
    }

    await api.post("/vender-moto", {
      moto_id: motoSelecionada.id,
      nome_cliente: clienteNome,
      valor: Number(valorMoto),
      forma_pagamento: formaPagamento,
      brinde,
      gasolina: gasolina ? Number(gasolina) : null,
      filial_venda: filialVenda
    });

    setMotoSelecionada(null);
    alert("Moto vendida com sucesso!");
  }

  if (!user) return null;

  return (
    <div className="home-container">

      {/* HEADER */}
      <div className="home-header">
        <h2>MotoNow • Gestão — {user.role}</h2>
        <button className="btn-sair" onClick={sair}>Sair</button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button onClick={() => setTab("pecas")}>📦 Peças</button>
        <button onClick={() => setTab("motos")}>🏍 Motos</button>
        <button onClick={() => nav("/vendas")}>🧾 Vendas</button>
        {user.role === "DIRETORIA" && (
          <button onClick={() => nav("/vendas-motos")}>🏍 Histórico Motos</button>
        )}
      </div>

      {/* ================= MOTOS ================= */}
      {tab === "motos" && (
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
            {motos.map(m => (
              <tr key={m.id}>
                <td>{m.modelo}</td>
                <td>{m.cor}</td>
                <td>{m.chassi}</td>
                <td>{m.filial}</td>
                <td>{m.santander ? "SIM" : "NÃO"}</td>
                <td>{m.status}</td>
                <td>
                  {m.status === "DISPONIVEL" && (
                    <button onClick={() => abrirVendaMoto(m)}>Vender</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ================= MODAL ================= */}
      {motoSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Venda da Moto</h3>

            <input
              placeholder="Cliente"
              value={clienteNome}
              onChange={e => setClienteNome(e.target.value)}
            />

            <input
              type="number"
              placeholder="Valor"
              value={valorMoto}
              onChange={e => setValorMoto(e.target.value)}
            />

            <select
              value={filialVenda}
              onChange={e => setFilialVenda(e.target.value)}
            >
              <option value="">Filial</option>
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
              />
              Brinde
            </label>

            <input
              type="number"
              placeholder="Gasolina"
              value={gasolina}
              onChange={e => setGasolina(e.target.value)}
            />

            <input
              placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
            />

            <button onClick={confirmarVendaMoto}>Confirmar</button>
            <button onClick={() => setMotoSelecionada(null)}>Cancelar</button>
          </div>
        </div>
      )}

    </div>
  );
}