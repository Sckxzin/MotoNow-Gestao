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
  const [santanderFiltro, setSantanderFiltro] = useState("TODOS");

  // ✅ NOVO: filtro de CNPJ (motos)
  const [cnpjFiltro, setCnpjFiltro] = useState("TODOS");

  const [modalCadastrar, setModalCadastrar] = useState(false);
  const [nomePeca, setNomePeca] = useState("");
  const [valorPeca, setValorPeca] = useState("");
  const [filialPeca, setFilialPeca] = useState("");

  /* ===== MODAL VENDA MOTO ===== */
  const [motoSelecionada, setMotoSelecionada] = useState(null);
  const [clienteNome, setClienteNome] = useState("");
  const [valorMoto, setValorMoto] = useState("");
  const [brinde, setBrinde] = useState(false);
  const [gasolina, setGasolina] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [comoChegou, setComoChegou] = useState("");
  const [filialVenda, setFilialVenda] = useState("");
  const [numeroCliente, setNumeroCliente] = useState("");

  /* ===== TRANSFERIR MOTO ===== */
  const [motoTransferir, setMotoTransferir] = useState(null);
  const [filialDestinoMoto, setFilialDestinoMoto] = useState("");

  /* ===== TRANSFERIR PEÇA ===== */
  const [pecaTransferir, setPecaTransferir] = useState(null);
  const [quantidadeTransferir, setQuantidadeTransferir] = useState("");
  const [cidadeDestino, setCidadeDestino] = useState("");

  /* ===== CADASTRAR MOTO ===== */
  const [modalCadastrarMoto, setModalCadastrarMoto] = useState(false);

  const [modeloMoto, setModeloMoto] = useState("");
  const [corMoto, setCorMoto] = useState("");
  const [chassiMoto, setChassiMoto] = useState("");
  const [anoMoto, setAnoMoto] = useState("");
  const [valorCompra, setValorCompra] = useState("");
  const [repasse, setRepasse] = useState("");
  const [filialMoto, setFilialMoto] = useState("");
  const [cnpjEmpresa, setCnpjEmpresa] = useState("");
  const [santanderMoto, setSantanderMoto] = useState(false);

  const pecasFiltradas = pecas
    .filter(p => p.nome?.toLowerCase().includes(busca.toLowerCase()))
    .filter(p => cidadeFiltroPecas === "TODAS" || p.cidade === cidadeFiltroPecas)
    .filter(p => tipoFiltroPecas === "TODOS" || p.tipo_moto === tipoFiltroPecas);

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

  /* ================= HELPERS ================= */
  function sair() {
    localStorage.clear();
    nav("/");
  }

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

  const tiposPecas = [
    "TODOS",
    ...Array.from(new Set(pecas.map(p => p.tipo_moto).filter(Boolean)))
  ];

  // ✅ NOVO: lista de CNPJs disponíveis (para o select)
  const cnpjsDisponiveis = Array.from(
    new Set(
      motos
        .map(m => (m.cnpj_empresa || "").trim())
        .filter(cnpj => cnpj !== "")
    )
  ).sort();

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [
      headers.join(";"),
      ...dados.map(row => headers.map(h => `"${row[h] ?? ""}"`).join(";"))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
  }

  /* ================= CARRINHO ================= */
  function adicionarCarrinho(peca) {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const existente = carrinho.find(i => i.peca_id === peca.id);

    if (existente) existente.quantidade += 1;
    else {
      carrinho.push({
        peca_id: peca.id,
        nome: peca.nome,
        quantidade: 1,
        preco_unitario: Number(peca.preco)
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
    setGasolina("");
    setFormaPagamento("");
    setComoChegou("");
    setFilialVenda("");
    setNumeroCliente("");
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
      como_chegou: comoChegou,
      filial_venda: filialVenda,
      numero_cliente: numeroCliente
    });

    setMotos(prev =>
      prev.map(m =>
        m.id === motoSelecionada.id ? { ...m, status: "VENDIDA" } : m
      )
    );

    setMotoSelecionada(null);
    alert("Moto vendida com sucesso!");
  }

  async function cadastrarPeca() {
    if (!nomePeca || !valorPeca || !filialPeca) {
      alert("Preencha todos os campos");
      return;
    }

    await api.post("/pecas", {
      nome: nomePeca,
      preco: Number(valorPeca),
      cidade: filialPeca,
      estoque: 0,
      tipo_moto: null
    });

    setModalCadastrar(false);
    setNomePeca("");
    setValorPeca("");
    setFilialPeca("");
    alert("Peça cadastrada com sucesso!");

    // recarrega peças
    api.get("/pecas", { params: { role: user.role, cidade: user.cidade } })
      .then(res => setPecas(res.data || []));
  }

  if (!user) return null;

  async function confirmarTransferenciaMoto() {
    if (!filialDestinoMoto) {
      alert("Selecione a filial destino");
      return;
    }

    await api.post("/transferir-moto", {
      moto_id: motoTransferir.id,
      filial_origem: motoTransferir.filial,
      filial_destino: filialDestinoMoto
    });

    setMotos(prev =>
      prev.map(m =>
        m.id === motoTransferir.id ? { ...m, filial: filialDestinoMoto } : m
      )
    );

    setMotoTransferir(null);
    setFilialDestinoMoto("");
    alert("Moto transferida com sucesso!");
  }

  function abrirTransferencia(peca) {
    setPecaTransferir(peca);
    setQuantidadeTransferir("");
    setCidadeDestino("");
  }

  async function confirmarTransferencia() {
    if (!quantidadeTransferir || !cidadeDestino) {
      alert("Preencha quantidade e filial destino");
      return;
    }

    if (Number(quantidadeTransferir) <= 0) {
      alert("Quantidade inválida");
      return;
    }

    await api.post("/transferir-peca", {
      peca_id: pecaTransferir.id,
      quantidade: Number(quantidadeTransferir),
      filial_origem: pecaTransferir.cidade,
      filial_destino: cidadeDestino
    });

    setPecas(prev =>
      prev.map(p =>
        p.id === pecaTransferir.id
          ? { ...p, estoque: p.estoque - Number(quantidadeTransferir) }
          : p
      )
    );

    setPecaTransferir(null);
    alert("Transferência realizada com sucesso!");
  }

  async function cadastrarMoto() {
    if (
      !modeloMoto ||
      !corMoto ||
      !chassiMoto ||
      !anoMoto ||
      !valorCompra ||
      !repasse ||
      !filialMoto ||
      
      !cnpjEmpresa
    ) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    await api.post("/motos", {
      modelo: modeloMoto,
      cor: corMoto,
      chassi: chassiMoto,
      ano: Number(anoMoto),
      valor: Number(valorCompra),
      repasse: Number(repasse),
      filial: filialMoto,
      cnpj_empresa: cnpjEmpresa,
      santander: santanderMoto,
      status: "DISPONIVEL"
    });

    setModalCadastrarMoto(false);

    setModeloMoto("");
    setCorMoto("");
    setChassiMoto("");
    setAnoMoto("");
    setValorCompra("");
    setFilialMoto("");
    setCnpjEmpresa("");
    setSantanderMoto(false);

    alert("Moto cadastrada com sucesso!");

    // recarrega motos
    api.get("/motos").then(res => setMotos(res.data || []));
  }

  /* ================= JSX ================= */
  return (
    <div className="home-container">
      {/* HEADER */}
      <div className="home-header">
        <h2>
          MotoNow <span>Gestão</span>
        </h2>
        <span className="user-role">
          {user.role} • {user.cidade}
        </span>
        <button className="btn-sair" onClick={sair}>
          Sair
        </button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className="tab-btn" onClick={() => setTab("pecas")}>
          📦 Peças
        </button>
        <button className="tab-btn" onClick={() => setTab("motos")}>
          🏍 Motos
        </button>

        {user.role === "DIRETORIA" && (
          <button className="tab-btn" onClick={() => nav("/vendas")}>
            🧾 Vendas
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="tab-btn" onClick={() => setModalCadastrar(true)}>
            Cadastrar Peças
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="tab-btn" onClick={() => nav("/vendas-motos")}>
            🏍 Histórico Motos
          </button>
        )}

        <button className="tab-btn" onClick={() => nav("/carrinho")}>
          🛒 Carrinho
        </button>
        
        {user.role === "DIRETORIA" && (
        <button className="tab-btn" onClick={() => nav("/dashboard-tv")}>
           📺 Dashboard TV
          </button>
      (}
      </div>

      {/* ================= PEÇAS ================= */}
      {tab === "pecas" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 15 }}>
            {user.role === "DIRETORIA" && (
              <select
                className="select-filial"
                value={cidadeFiltroPecas}
                onChange={e => setCidadeFiltroPecas(e.target.value)}
              >
                <option value="TODAS">Todas as cidades</option>
                <option value="ESCADA">Escada</option>
                <option value="IPOJUCA">Ipojuca</option>
                <option value="RIBEIRAO">Ribeirão</option>
                <option value="SAO JOSE">São José</option>
                <option value="CATENDE">Catende</option>
                <option value="XEXEU">Xexeu</option>
                <option value="MARAGOGI">Maragogi</option>
                <option value="CHA GRANDE">Cha grande</option>
              </select>
            )}

            <select
              className="select-filial"
              value={tipoFiltroPecas}
              onChange={e => setTipoFiltroPecas(e.target.value)}
            >
              {tiposPecas.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              className="input-busca"
              placeholder="Buscar peça..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <button
            onClick={() =>
              exportarCSV(
                "pecas_filtradas.csv",
                ["nome", "tipo", "filial", "quantidade", "valor", "created_at"],
                pecasFiltradas.map(p => ({
                  nome: p.nome,
                  tipo: p.tipo_moto || "UNIVERSAL",
                  filial: p.cidade,
                  quantidade: p.estoque,
                  valor: Number(p.preco).toFixed(2),
                  created_at: p.created_at
                    ? new Date(p.created_at).toLocaleDateString("pt-BR")
                    : ""
                }))
              )
            }
          >
            📥 Exportar Peças (Filtradas)
          </button>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Filial</th>
                <th>Qtd</th>
                <th>Valor</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {pecas
                .filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
                .filter(p => cidadeFiltroPecas === "TODAS" || p.cidade === cidadeFiltroPecas)
                .filter(p => tipoFiltroPecas === "TODOS" || p.tipo_moto === tipoFiltroPecas)
                .map(p => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>
                      <strong>{p.tipo_moto || "UNIVERSAL"}</strong>
                    </td>
                    <td>{p.cidade}</td>
                    <td>{p.estoque}</td>
                    <td>R$ {Number(p.preco).toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="action-btn" onClick={() => adicionarCarrinho(p)}>
                          🛒
                        </button>

                        {user.role === "DIRETORIA" && (
                          <button className="action-btn" onClick={() => abrirTransferencia(p)}>
                            🔄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {/* ================= MOTOS ================= */}
      {tab === "motos" && (
        <>
          <div className="resumo-motos">
            {Object.entries(resumoMotos).map(([c, d]) => (
              <div key={c} className="resumo-card">
                <strong>{c}</strong>
                <br />
                🟢 {d.disponiveis} | 🔴 {d.vendidas}
              </div>
            ))}
          </div>

          <input
            className="input-busca"
            placeholder="Buscar por modelo ou chassi..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />

          {user.role === "DIRETORIA" && (
            <button className="tab-btn" onClick={() => setModalCadastrarMoto(true)}>
              ➕ Cadastrar Moto
            </button>
          )}

          {user.role === "DIRETORIA" && (
            <select
              className="select-filial"
              value={santanderFiltro}
              onChange={e => setSantanderFiltro(e.target.value)}
            >
              <option value="TODOS">Todos</option>
              <option value="SIM">MOTONOW</option>
              <option value="NAO">EMENEZES</option>
            </select>
          )}

          {/* ✅ NOVO SELECT: CNPJ */}
          {user.role === "DIRETORIA" && (
            <select
              className="select-filial"
              value={cnpjFiltro}
              onChange={e => setCnpjFiltro(e.target.value)}
            >
              <option value="TODOS">Todos CNPJs</option>
              <option value="SEM_CNPJ">Sem CNPJ</option>
              {cnpjsDisponiveis.map(cnpj => (
                <option key={cnpj} value={cnpj}>
                  {cnpj}
                </option>
              ))}
            </select>
          )}

          <select
            className="select-filial"
            value={cidadeFiltroMotos}
            onChange={e => setCidadeFiltroMotos(e.target.value)}
          >
            <option value="TODAS">Todas</option>
            <option value="ESCADA">Escada</option>
            <option value="IPOJUCA">Ipojuca</option>
            <option value="RIBEIRAO">Ribeirão</option>
            <option value="SAO JOSE">São José</option>
            <option value="CATENDE">Catende</option>
            <option value="XEXEU">Xexeu</option>
            <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
            <option value="MARAGOGI">Maragogi</option>
            <option value="CHA GRANDE">Cha grande</option>
          </select>

          <button
            onClick={() =>
              exportarCSV(
                "motos_disponiveis.csv",
                ["modelo", "cor", "chassi", "ano", "valor", "filial", "status", "cnpj", "created_at"],
                motos.map(m => ({
                  modelo: m.modelo,
                  cor: m.cor,
                  chassi: m.chassi,
                  ano: m.ano_moto,
                  valor: m.valor_compra ?? m.valor ?? "",
                  filial: m.filial,
                  status: m.status,
                  cnpj: m.cnpj_empresa,
                  created_at: m.created_at ? new Date(m.created_at).toLocaleDateString("pt-BR") : ""
                }))
              )
            }
          >
            📥 Exportar Motos Disponíveis
          </button>

          <table className="table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Ano</th>
                <th>Cor</th>
                <th>Chassi</th>
                <th>Filial</th>
                <th>Santander</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {motos
                .filter(m => cidadeFiltroMotos === "TODAS" || m.filial === cidadeFiltroMotos)
                .filter(m => {
                  if (santanderFiltro === "TODOS") return true;
                  if (santanderFiltro === "SIM") return m.santander === true;
                  if (santanderFiltro === "NAO") return m.santander === false || m.santander == null;
                  return true;
                })
                // ✅ FILTRO CNPJ APLICADO AQUI
                .filter(m => {
                  const cnpj = (m.cnpj_empresa || "").trim();
                  if (cnpjFiltro === "TODOS") return true;
                  if (cnpjFiltro === "SEM_CNPJ") return cnpj === "";
                  return cnpj === cnpjFiltro;
                })
                .filter(m => {
                  const q = busca.toLowerCase();
                  return (
                    busca === "" ||
                    m.modelo?.toLowerCase().includes(q) ||
                    m.chassi?.toLowerCase().includes(q)
                  );
                })
                .map(m => (
                  <tr key={m.id}>
                    <td>{m.modelo}</td>
                    <td>{m.ano_moto}</td>
                    <td>{m.cor}</td>
                    <td>{m.chassi}</td>
                    <td>
                      <span className={`cidade-tag ${m.filial.toLowerCase().replace(/\s/g, "-")}`}>
                        {m.filial}
                      </span>
                    </td>
                    <td>{m.santander === true ? "SIM" : "NÃO"}</td>
                    <td>{m.cnpj_empresa || "-"}</td>
                    <td>
                      <span className={`status ${m.status.toLowerCase()}`}>{m.status}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {m.status === "DISPONIVEL" && (
                          <button className="action-btn" onClick={() => abrirVendaMoto(m)}>
                            Vender
                          </button>
                        )}

                        {user.role === "DIRETORIA" && m.status === "DISPONIVEL" && (
                          <button className="action-btn" onClick={() => setMotoTransferir(m)}>
                            🔄
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      )}

      {/* ================= MODAL ================= */}
      {motoSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Venda da Moto</h3>

            <input placeholder="Cliente" value={clienteNome}
              onChange={e => setClienteNome(e.target.value)} />

            <input type="number" placeholder="Valor"
              value={valorMoto} onChange={e => setValorMoto(e.target.value)} />

            <select value={filialVenda} onChange={e => setFilialVenda(e.target.value)}>
              <option value="">Filial da venda</option>
              <option value="ESCADA">ESCADA</option>
              <option value="IPOJUCA">IPOJUCA</option>
              <option value="RIBEIRAO">RIBEIRÃO</option>
              <option value="SAO JOSE">SÃO JOSÉ</option>
              <option value="CATENDE">CATENDE</option>
              <option value="XEXEU">XEXEU</option>
              <option 
value="MARAGOGI">MARAGOGI</option>
             <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
             <option value="OUTRAS CIDADES">DISTRI VALTER </option>
              <option value="CHA GRANDE">Cha grande</option>
            </select>

            <label>
              <input type="checkbox" checked={brinde}
                onChange={e => setBrinde(e.target.checked)} /> Brinde
            </label>

            <input
              type="number"
              placeholder="Gasolina (opcional)"
              value={gasolina}
              onChange={e => setGasolina(e.target.value)}
            />

            <input
              type="Numero cliente"
              placeholder="Numero cliente"
              value={numeroCliente}
              onChange={e => setNumeroCliente(e.target.value)}
             />
             

            <input
              placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={e => setFormaPagamento(e.target.value)}
            />
           <select
        value={comoChegou}
        onChange={e => setComoChegou(e.target.value)}
      >
        <option value="">Como o cliente chegou?</option>
        <option value="Tenda">Tenda</option>
        <option value="Veio em loja">Veio em loja</option>
        <option value="Leads">Leads</option>
        
      </select>

            <button onClick={confirmarVendaMoto}>Confirmar</button>
            <button onClick={() => setMotoSelecionada(null)}>Cancelar</button>

          </div>
        </div>
      )}
     {pecaTransferir && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>🔄 Transferir Peça</h3>

      <p><strong>{pecaTransferir.nome}</strong></p>
      <p>Origem: {pecaTransferir.cidade}</p>

      <input
        type="number"
        placeholder="Quantidade"
        value={quantidadeTransferir}
        onChange={e => setQuantidadeTransferir(e.target.value)}
      />

      <select
        value={cidadeDestino}
        onChange={e => setCidadeDestino(e.target.value)}
      >
        <option value="">Filial destino</option>
        <option value="ESCADA">Escada</option>
        <option value="IPOJUCA">Ipojuca</option>
        <option value="RIBEIRAO">Ribeirão</option>
        <option value="SAO JOSE">São José</option>
        <option value="CATENDE">Catende</option>
        <option value="XEXEU">Xexeu</option>
<option 
value="MARAGOGI">MARAGOGI</option>
       <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
        <option value="CHA GRANDE">Cha grande</option>
      </select>

      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button onClick={confirmarTransferencia}>Confirmar</button>
        <button onClick={() => setPecaTransferir(null)}>Cancelar</button>
      </div>
    </div>
  </div>
)}
     {motoTransferir && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>🔄 Transferir Moto</h3>

      <p><strong>{motoTransferir.modelo}</strong></p>
      <p>Chassi: {motoTransferir.chassi}</p>
      <p>Origem: {motoTransferir.filial}</p>

      <select
        value={filialDestinoMoto}
        onChange={e => setFilialDestinoMoto(e.target.value)}
      >
        <option value="">Filial destino</option>
        <option value="ESCADA">Escada</option>
        <option value="IPOJUCA">Ipojuca</option>
        <option value="RIBEIRAO">Ribeirão</option>
        <option value="SAO JOSE">São José</option>
        <option value="CATENDE">Catende</option>
        <option value="XEXEU">Xexeu</option>
        <option value="MARAGOGI">Maragogi</option>
       <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
        <option value="CHA GRANDE">Cha grande</option>
      </select>

      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button onClick={confirmarTransferenciaMoto}>Confirmar</button>
        <button onClick={() => setMotoTransferir(null)}>Cancelar</button>
      </div>
    </div>
  </div>
)}
     {modalCadastrar && user.role === "DIRETORIA" && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Cadastrar</h3>

     <input
  placeholder="Nome"
  value={nomePeca}
  onChange={e => setNomePeca(e.target.value)}
/>

<input
  type="number"
  placeholder="Valor"
  value={valorPeca}
  onChange={e => setValorPeca(e.target.value)}
/>

<select
  value={filialPeca}
  onChange={e => setFilialPeca(e.target.value)}
>
  <option value="">Filial</option>
  <option value="ESCADA">Escada</option>
  <option value="IPOJUCA">Ipojuca</option>
  <option value="RIBEIRAO">Ribeirão</option>
  <option value="SAO JOSE">São José</option>
  <option value="CATENDE">Catende</option>
  <option value="XEXEU">Xexeu</option>
  <option value="CHA GRANDE">Cha grande</option>
</select>


      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => cadastrarPeca()}>
          Salvar
        </button>
        <button onClick={() => setModalCadastrar(false)}>
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}
             {modalCadastrarMoto && user.role === "DIRETORIA" && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>Cadastrar Moto</h3>

      <input placeholder="Modelo" value={modeloMoto}
        onChange={e => setModeloMoto(e.target.value)} />

      <input placeholder="Cor" value={corMoto}
        onChange={e => setCorMoto(e.target.value)} />

      <input placeholder="Chassi" value={chassiMoto}
        onChange={e => setChassiMoto(e.target.value)} />

      <input placeholder="Ano" value={anoMoto}
        onChange={e => setAnoMoto(e.target.value)} />

      <input type="number" placeholder="Valor compra" value={valorCompra}
        onChange={e => setValorCompra(e.target.value)} />
       
      <input type="number" placeholder=" Valor Repasse" value={repasse}
        onChange={e => setRepasse(e.target.value)} />
      

      <select value={filialMoto}
        onChange={e => setFilialMoto(e.target.value)}>
        <option value="">Filial</option>
        <option value="ESCADA">Escada</option>
        <option value="IPOJUCA">Ipojuca</option>
        <option value="RIBEIRAO">Ribeirão</option>
        <option value="SAO JOSE">São José</option>
        <option value="CATENDE">Catende</option>
        <option value="XEXEU">Xexeu</option>
        <option value="MARAGOGI">Maragogi</option>
        <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
        <option value="CHA GRANDE">Cha grande</option>
      </select>

      <input placeholder="CNPJ da empresa"
        value={cnpjEmpresa}
        onChange={e => setCnpjEmpresa(e.target.value)} />

      <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={santanderMoto}
          onChange={e => setSantanderMoto(e.target.checked)}
        />
        Financiada Santander
      </label>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={cadastrarMoto}>Salvar</button>
        <button onClick={() => setModalCadastrarMoto(false)}>Cancelar</button>
      </div>
    </div>
  </div>
)}



    </div>
  );
}
