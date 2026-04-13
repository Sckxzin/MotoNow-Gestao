
/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./VendasMotos.css";
import "./Home.css";

/* ================= CONFIG MODELOS (CADASTRO MOTO) ================= */
const MODELOS_MOTOS = [
  { modelo: "JET 125 SS", compra_motonow: 8390, compra_santander: 8900, santanderDefault: false },
  { modelo: "SHI 175 EFI", compra_motonow: 13790, compra_santander: 14900, santanderDefault: true },
  { modelo: "STORM 200", compra_motonow: 17990, compra_santander: 19100, santanderDefault: true },
  { modelo: "JEF 150", compra_motonow: 11090, compra_santander: 12200, santanderDefault: true },
  { modelo: "JET 50", compra_motonow: 7990, compra_santander: 8500, santanderDefault: true },
  { modelo: "URBAN 150 EFI", compra_motonow: 16990, compra_santander: 18100, santanderDefault: true},
  { modelo: "NEW JET 125", compra_motonow: 8889, compra_santander: 9500, santanderDefault: true },
  { modelo: "SHI 175 CARB", compra_motonow: 11790, compra_santander: 12900, santanderDefault: true},
  { modelo: "IRON 250", compra_motonow: 18490, compra_santander: 19600, santanderDefault: true},
  { modelo: "ATV 125 EFI", compra_motonow: 11989, compra_santander: 15000, santanderDefault: true},
  { modelo: "PT2XS", compra_motonow: 5290, compra_santander: 6200, santanderDefault: true},
  { modelo: "PT1", compra_motonow:  4790, compra_santander: 5590, santanderDefault: true},
  { modelo: "PT1S", compra_motonow:  4790, compra_santander: 5790, santanderDefault: true},
  { modelo: "NEW JEF", compra_motonow: 11390, compra_santander: 12600, santanderDefault: true},
  { modelo: "PHOENIX 50S", compra_motonow: 6490, compra_santander: 7100, santaderDefault: true},
  { modelo: "JEF 150 EFI", compra_motonow: 11390, compra_santander: 13800, santanderDefault: true},
  { modelo: "ATV 200 EFI", compra_motonow: 21000, compra_santander: 23000, santanderDefaul: true},
  { modelo: "NEW JET 125 EFI", compra_motonow: 10490, compra_santander: 0, santanderDefault: false},
  { modelo: "PT4 PRO", compra_motonow: 7990, compra_santander: 8300, santanderDefault: true},
  { modelo: "PT3 TRICICLO", compra_motonow: 6900, compra_santander: 11590, santanderDefault: true},
];

/* ================= REGRA: REPASSE OBRIGATÓRIO EM FILIAIS ================= */
const FILIAIS_REPASSE_OBRIGATORIO = ["SAO JOSE", "MARAGOGI", "CATENDE", "XEXEU"];

function normText(s) {
  return String(s || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim();
}

function normModeloKey(s) {
  return normText(s).replace(/[^A-Z0-9]/g, "");
}

const REPASSE_SANTANDER_POR_MODELO = {
  [normModeloKey("JET 125 SS")]: 8900,
  [normModeloKey("SHI 175 EFI")]: 14900,
  [normModeloKey("STORM 200")]: 19199,
  [normModeloKey("JEF 150")]: 12200,
  [normModeloKey("JET 50")]: 8500,
  [normModeloKey("NEW JET 125")]: 9500,
  [normModeloKey("URBAN 150 EFI")]:18100,
  [normModeloKey("IRON 250")]:19600,
  [normModeloKey("ATV 125 EFI")]:15000,
  [normModeloKey("PT2XS")]:6200,
  [normModeloKey("PT1")]:5290,
  [normModeloKey("PT1S")]:5790,
  [normModeloKey("NEW JEF")]:12600,
  [normModeloKey("PHOENIX 50S")]:7100,
  [normModeloKey("JEF 150 EFI")]:13800,
  [normModeloKey("ATV 200 EFI")]:23000,
  [normModeloKey("PT3 TRICICLO")]:11590,
};

function isRepasseObrigatorio(filial) {
  return FILIAIS_REPASSE_OBRIGATORIO.includes(normText(filial));
}

function repassePorModelo(modelo) {
  return REPASSE_SANTANDER_POR_MODELO[normModeloKey(modelo)];
}

function cidadeClass(cidade) {
  return String(cidade || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .trim();
}

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

  // ✅ filtro de CNPJ (motos)
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
  const [localRetirada, setLocalRetirada] = useState("");
  const [filialRetirada, setFilialRetirada] = useState("");

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
    .filter((p) => p.nome?.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => cidadeFiltroPecas === "TODAS" || p.cidade === cidadeFiltroPecas)
    .filter((p) => tipoFiltroPecas === "TODOS" || p.tipo_moto === tipoFiltroPecas);

const [pecaEntrada, setPecaEntrada] = useState(null);
const [quantidadeEntrada, setQuantidadeEntrada] = useState("");
const [precoEntrada, setPrecoEntrada] = useState("");

  /* ================= LOAD ================= */
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const data = JSON.parse(raw);
    if (!data?.role || !data?.cidade) return nav("/");

    setUser(data);

    api
      .get("/pecas", { params: { role: data.role, cidade: data.cidade } })
      .then((res) => setPecas(res.data || []))
      .catch(() => setPecas([]));

    api.get("/motos").then((res) => setMotos(res.data || [])).catch(() => setMotos([]));
  }, [nav]);

  /* ================= HELPERS ================= */
  function sair() {
    localStorage.clear();
    nav("/");
  }

  function calcularResumoMotos(lista) {
    const resumo = {};
    lista.forEach((m) => {
      if (!resumo[m.filial]) resumo[m.filial] = { disponiveis: 0, vendidas: 0 };
      if (m.status === "DISPONIVEL") resumo[m.filial].disponiveis++;
      if (m.status === "VENDIDA") resumo[m.filial].vendidas++;
    });
    return resumo;
  }

  const resumoMotos = calcularResumoMotos(motos);
const totalGeral = motos.reduce(
  (acc, m) => {
    if (m.status === "DISPONIVEL") acc.disponiveis++;
    if (m.status === "VENDIDA") acc.vendidas++;
    return acc;
  },
  { disponiveis: 0, vendidas: 0 }
);

  const tiposPecas = ["TODOS", ...Array.from(new Set(pecas.map((p) => p.tipo_moto).filter(Boolean)))];

  // ✅ lista de CNPJs disponíveis (para o select)
  const cnpjsDisponiveis = Array.from(
    new Set(motos.map((m) => (m.cnpj_empresa || "").trim()).filter((cnpj) => cnpj !== ""))
  ).sort();

  function exportarCSV(nomeArquivo, headers, dados) {
    const csv = [headers.join(";"), ...dados.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(";"))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();
  }

function abrirEntradaEstoque(peca) {
  setPecaEntrada(peca);
  setQuantidadeEntrada("");
  setPrecoEntrada(peca.preco != null ? String(peca.preco) : "");
}

  /* ================= CARRINHO ================= */
  function adicionarCarrinho(peca) {
    const carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
    const existente = carrinho.find((i) => i.peca_id === peca.id);

    if (existente) existente.quantidade += 1;
    else {
      carrinho.push({
        peca_id: peca.id,
        nome: peca.nome,
        quantidade: 1,
        preco_unitario: Number(peca.preco),
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
    setLocalRetirada("");
    setFilialRetirada("");
  }

  // ✅ Solicitação (PENDENTE_APROVACAO)
  async function confirmarVendaMoto() {
    if (!clienteNome || !valorMoto || !filialVenda || !numeroCliente ) {
      alert("Preencha cliente, valor, filial e número do cliente");
      return;
    }

    try {
      await api.post("/vender-moto", {
        moto_id: motoSelecionada.id,
        nome_cliente: clienteNome,
        valor: Number(valorMoto),
        forma_pagamento: formaPagamento || null,
        brinde: !!brinde,
        gasolina: gasolina ? Number(gasolina) : null,
        como_chegou: comoChegou || null,
        filial_venda: filialVenda,
        numero_cliente: String(numeroCliente),
        local_retirada: localRetirada,
        filial_retirada: localRetirada === "FILIAL" ? filialRetirada : null,
      });

      setMotos((prev) =>
        prev.map((m) => (m.id === motoSelecionada.id ? { ...m, status: "PENDENTE_APROVACAO" } : m))
      );

      setMotoSelecionada(null);
      alert("Solicitação enviada para diretoria!");
    } catch (err) {
      const msg = err?.response?.data?.message || "Erro ao solicitar venda";
      alert(msg);
      console.error("Erro confirmarVendaMoto:", err);
    }
  }

  /* ================= CADASTRAR PEÇA ================= */
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
      tipo_moto: null,
    });

    setModalCadastrar(false);
    setNomePeca("");
    setValorPeca("");
    setFilialPeca("");
    alert("Peça cadastrada com sucesso!");

    api.get("/pecas", { params: { role: user.role, cidade: user.cidade } }).then((res) => setPecas(res.data || []));
  }

  if (!user) return null;

  /* ================= TRANSFERIR MOTO ================= */
  async function confirmarTransferenciaMoto() {
    if (!filialDestinoMoto) {
      alert("Selecione a filial destino");
      return;
    }

    await api.post("/transferir-moto", {
      moto_id: motoTransferir.id,
      filial_origem: motoTransferir.filial,
      filial_destino: filialDestinoMoto,
    });

    setMotos((prev) => prev.map((m) => (m.id === motoTransferir.id ? { ...m, filial: filialDestinoMoto } : m)));

    setMotoTransferir(null);
    setFilialDestinoMoto("");
    alert("Moto transferida com sucesso!");
  }

async function confirmarEntradaEstoque() {
  if (!quantidadeEntrada || Number(quantidadeEntrada) <= 0) {
    alert("Informe uma quantidade válida");
    return;
  }

  try {
    const res = await api.put(`/pecas/${pecaEntrada.id}/adicionar-estoque`, {
      quantidade: Number(quantidadeEntrada),
      preco: precoEntrada !== "" ? Number(precoEntrada) : undefined,
    });

    const atualizada = res.data.peca;

    setPecas((prev) =>
      prev.map((p) =>
        p.id === atualizada.id ? { ...p, ...atualizada } : p
      )
    );

    setPecaEntrada(null);
    setQuantidadeEntrada("");
    setPrecoEntrada("");
    alert("Estoque adicionado com sucesso!");
  } catch (err) {
    const msg = err?.response?.data?.message || "Erro ao adicionar estoque";
    alert(msg);
    console.error("Erro confirmarEntradaEstoque:", err);
  }
}

  /* ================= TRANSFERIR PEÇA ================= */
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
      filial_destino: cidadeDestino,
    });

    setPecas((prev) =>
      prev.map((p) => (p.id === pecaTransferir.id ? { ...p, estoque: p.estoque - Number(quantidadeTransferir) } : p))
    );

    setPecaTransferir(null);
    alert("Transferência realizada com sucesso!");
  }

  /* ================= CADASTRAR MOTO ================= */
  async function cadastrarMoto() {
    // ✅ repasse NÃO é mais obrigatório no front (porque pode ser automático)
    if (!modeloMoto || !corMoto || !chassiMoto || !anoMoto || !valorCompra || !filialMoto || !cnpjEmpresa) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    // ✅ se filial exigir repasse, calcula automático
    let repasseFinal = repasse ? Number(repasse) : null;
    if (isRepasseObrigatorio(filialMoto)) {
      const r = repassePorModelo(modeloMoto);
      if (typeof r !== "number") {
        alert(`Repasse não configurado para o modelo: ${modeloMoto}`);
        return;
      }
      repasseFinal = r;
      setRepasse(String(r));
    }

    await api.post("/motos", {
      modelo: modeloMoto,
      cor: corMoto,
      chassi: chassiMoto,
      ano_moto: Number(anoMoto),
      valor_compra: Number(valorCompra),
      repasse: repasseFinal,
      filial: filialMoto,
      cnpj_empresa: cnpjEmpresa,
      santander: santanderMoto,
      status: "DISPONIVEL",
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
    setRepasse("");

    alert("Moto cadastrada com sucesso!");
    api.get("/motos").then((res) => setMotos(res.data || []));
  }

async function alterarStatusMoto(id, novoStatus) {
  try {
    await api.put(
      `/motos/${id}/status`,
      { status: novoStatus },
      {
        headers: {
          "x-user-id": user.id,
          "x-role": user.role,
        },
      }
    );

    setMotos((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: novoStatus } : m
      )
    );

    alert(`Moto marcada como ${novoStatus}`);
  } catch (err) {
    const msg = err?.response?.data?.message || "Erro ao alterar status da moto";
    alert(msg);
    console.error("Erro alterarStatusMoto:", err);
  }
}
  /* ================= JSX ================= */
  return (
  <div className="vendas-motos-container">
    {/* TOPBAR */}
    <div className="vm-topbar">
      <div>
        <h2 className="vm-title">🏠 MotoNow Gestão</h2>
        <p className="vm-subtitle">
          {user.role} • {user.cidade}
        </p>
      </div>

      <div className="vm-topbar-actions">
        <button className="vm-btn vm-btn-ghost" onClick={sair}>
          Sair
        </button>
      </div>
    </div>

    {/* MENU / AÇÕES */}
    <div className="vm-card">
      <div className="home-actions-grid">
        <button className="vm-btn vm-btn-soft" onClick={() => setTab("pecas")}>
          📦 Peças
        </button>

        <button className="vm-btn vm-btn-soft" onClick={() => setTab("motos")}>
          🏍 Motos
        </button>

        {user && (user.role === "DIRETORIA" || user.role === "PECA") && (
          <button className="vm-btn vm-btn-soft" onClick={() => nav("/vendas")}>
            🧾 Vendas
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => setModalCadastrar(true)}>
            ➕ Cadastrar Peças
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => nav("/vendas-motos")}>
            🏍 Histórico Motos
          </button>
        )}

        <button className="vm-btn vm-btn-soft" onClick={() => nav("/carrinho")}>
          🛒 Carrinho
        </button>

        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => nav("/vendas-motos-pendentes")}>
            🕒 Aprovar Vendas
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => nav("/emplacamentos")}>
            🪪 Emplacamentos
          </button>
        )}

        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => nav("/dashboard-tv")}>
            📺 Dashboard TV
          </button>
        )}
        {user.role === "DIRETORIA" && (
<button onClick={() => nav("/financeiro")}>
  💰 Financeiro
</button>
    )}
      </div>
    </div>

      {/* ================= PEÇAS ================= */}
      {tab === "pecas" && (
  <>
    <div className="vm-card">
      <div className="vm-filters-grid">
                {user && (user.role === "DIRETORIA" || user.role === "PECA") && (
          <div className="vm-field">
            <label>Filial</label>
            <select
              value={cidadeFiltroPecas}
              onChange={(e) => setCidadeFiltroPecas(e.target.value)}
            >
              <option value="TODAS">Todas as cidades</option>
              <option value="ESCADA">Escada</option>
              <option value="IPOJUCA">Ipojuca</option>
              <option value="RIBEIRAO">Ribeirão</option>
              <option value="SAO JOSE">São José</option>
              <option value="CATENDE">Catende</option>
              <option value="XEXEU">Xexeu</option>
              <option value="MARAGOGI">Maragogi</option>
              <option value="CHA GRANDE">Cha Grande</option>
            </select>
          </div>
        )}

        <div className="vm-field">
          <label>Tipo</label>
          <select value={tipoFiltroPecas} onChange={(e) => setTipoFiltroPecas(e.target.value)}>
            {tiposPecas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="vm-field vm-field-wide">
          <label>Busca</label>
          <input
            placeholder="Buscar peça..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="vm-quickbar">
        <button
          className="vm-btn vm-btn-primary"
          onClick={() =>
            exportarCSV(
              "pecas_filtradas.csv",
              ["nome", "tipo", "filial", "quantidade", "valor", "created_at"],
              pecasFiltradas.map((p) => ({
                nome: p.nome,
                tipo: p.tipo_moto || "UNIVERSAL",
                filial: p.cidade,
                quantidade: p.estoque,
                valor: Number(p.preco).toFixed(2),
                created_at: p.created_at
                  ? new Date(p.created_at).toLocaleDateString("pt-BR")
                  : "",
              }))
            )
          }
        >
          📥 Exportar Peças
        </button>
      </div>
    </div>

    <div className="table-container vm-table-card">
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
            .filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()))
            .filter((p) => cidadeFiltroPecas === "TODAS" || p.cidade === cidadeFiltroPecas)
            .filter((p) => tipoFiltroPecas === "TODOS" || p.tipo_moto === tipoFiltroPecas)
            .map((p) => (
              <tr key={p.id}>
                <td>{p.nome}</td>
                <td><strong>{p.tipo_moto || "UNIVERSAL"}</strong></td>
                <td>{p.cidade}</td>
                <td>{p.estoque}</td>
                <td>R$ {Number(p.preco).toFixed(2)}</td>
               
                  <td>
  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
    <button className="action-btn" onClick={() => adicionarCarrinho(p)}>
      🛒
    </button>

    {user.role === "DIRETORIA" && (
      <button className="action-btn" onClick={() => abrirTransferencia(p)}>
        🔄
      </button>
    )}

    {user.role === "DIRETORIA" && (
      <button className="action-btn" onClick={() => abrirEntradaEstoque(p)}>
        ➕
      </button>
    )}
  </div>
</td>
              </tr>
            ))}

          {pecasFiltradas.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", opacity: 0.7, padding: 14 }}>
                Nenhuma peça encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </>
)}

      {/* ================= MOTOS ================= */}
      {tab === "motos" && (
  <>
    <div className="vm-stats">
      {Object.entries(resumoMotos).map(([c, d]) => (
        <div key={c} className="vm-stat">
          <div className="vm-stat-label">{c}</div>
          <div className="vm-stat-value">🟢 {d.disponiveis} | 🔴 {d.vendidas}</div>
        </div>
<div className="vm-stat vm-stat-highlight">
  <div className="vm-stat-label">🏍 TOTAL GERAL</div>
  <div className="vm-stat-value">
    🟢 {totalGeral.disponiveis} | 🔴 {totalGeral.vendidas}
  </div>
      ))}
    </div>

    <div className="vm-card">
      <div className="vm-filters-grid">
        <div className="vm-field vm-field-wide">
          <label>Busca</label>
          <input
            placeholder="Buscar por modelo ou chassi..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {user.role === "DIRETORIA" && (
          <div className="vm-field">
            <label>Empresa</label>
            <select value={santanderFiltro} onChange={(e) => setSantanderFiltro(e.target.value)}>
              <option value="TODOS">Todos</option>
              <option value="SIM">MOTONOW</option>
              <option value="NAO">EMENEZES</option>
            </select>
          </div>
        )}

        {user.role === "DIRETORIA" && (
          <div className="vm-field">
            <label>CNPJ</label>
            <select value={cnpjFiltro} onChange={(e) => setCnpjFiltro(e.target.value)}>
              <option value="TODOS">Todos CNPJs</option>
              <option value="SEM_CNPJ">Sem CNPJ</option>
              {cnpjsDisponiveis.map((cnpj) => (
                <option key={cnpj} value={cnpj}>
                  {cnpj}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="vm-field">
          <label>Filial</label>
          <select value={cidadeFiltroMotos} onChange={(e) => setCidadeFiltroMotos(e.target.value)}>
            <option value="TODAS">Todas</option>
            <option value="ESCADA">Escada</option>
            <option value="IPOJUCA">Ipojuca</option>
            <option value="RIBEIRAO">Ribeirão</option>
            <option value="SAO JOSE">São José</option>
            <option value="CATENDE">Catende</option>
            <option value="XEXEU">Xexeu</option>
            <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
            <option value="MARAGOGI">Maragogi</option>
            <option value="CHA GRANDE">Cha Grande</option>
          </select>
        </div>
      </div>

      <div className="vm-quickbar">
        {user.role === "DIRETORIA" && (
          <button className="vm-btn vm-btn-soft" onClick={() => setModalCadastrarMoto(true)}>
            ➕ Cadastrar Moto
          </button>
        )}

        <button
          className="vm-btn vm-btn-primary"
          onClick={() =>
            exportarCSV(
              "motos_disponiveis.csv",
              ["modelo", "cor", "chassi", "ano", "valor", "filial", "status", "cnpj", "created_at"],
              motos.map((m) => ({
                modelo: m.modelo,
                cor: m.cor,
                chassi: m.chassi,
                ano: m.ano_moto,
                valor: m.valor_compra ?? m.valor ?? "",
                filial: m.filial,
                status: m.status,
                cnpj: m.cnpj_empresa,
                created_at: m.created_at
                  ? new Date(m.created_at).toLocaleDateString("pt-BR")
                  : "",
              }))
            )
          }
        >
          📥 Exportar Motos
        </button>
      </div>
    </div>

    <div className="table-container vm-table-card">
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
            .filter((m) => cidadeFiltroMotos === "TODAS" || m.filial === cidadeFiltroMotos)
            .filter((m) => {
              if (santanderFiltro === "TODOS") return true;
              if (santanderFiltro === "SIM") return m.santander === true;
              if (santanderFiltro === "NAO") return m.santander === false || m.santander == null;
              return true;
            })
            .filter((m) => {
              const cnpj = (m.cnpj_empresa || "").trim();
              if (cnpjFiltro === "TODOS") return true;
              if (cnpjFiltro === "SEM_CNPJ") return cnpj === "";
              return cnpj === cnpjFiltro;
            })
            .filter((m) => {
              const q = busca.toLowerCase();
              return busca === "" || m.modelo?.toLowerCase().includes(q) || m.chassi?.toLowerCase().includes(q);
            })
            .map((m) => (
              <tr key={m.id}>
                <td>{m.modelo}</td>
                <td>{m.ano_moto}</td>
                <td>{m.cor}</td>
                <td>{m.chassi}</td>
                <td>
  <span className={`cidade-tag ${cidadeClass(m.filial)}`}>
    {m.filial}
  </span>
</td>
                <td>{m.santander === true ? "SIM" : "NÃO"}</td>
                <td>{m.cnpj_empresa || "-"}</td>
                <td>
                  <span className={`status ${String(m.status || "").toLowerCase()}`}>{m.status}</span>
                </td>
                <td>
  <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
    {m.status === "DISPONIVEL" && (
      <>
        <button className="action-btn" onClick={() => abrirVendaMoto(m)}>
          Vender
        </button>

        <button
          className="action-btn"
          onClick={() => alterarStatusMoto(m.id, "NEGOCIACAO")}
        >
          🤝 Negociação
        </button>
      </>
    )}

    {m.status === "NEGOCIACAO" &&
  (user.role === "DIRETORIA" || Number(m.negociacao_por) === Number(user.id)) && (
    <button
      className="action-btn"
      onClick={() => alterarStatusMoto(m.id, "DISPONIVEL")}
    >
      ↩ Liberar
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
    </div>
  </>
)}

      {/* ================= MODAL VENDA ================= */}
      {motoSelecionada && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Venda da Moto</h3>

            <input placeholder="Cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} />

            <input type="number" placeholder="Valor" value={valorMoto} onChange={(e) => setValorMoto(e.target.value)} />

            <select value={filialVenda} onChange={(e) => setFilialVenda(e.target.value)}>
              <option value="">Filial da venda</option>
              <option value="ESCADA">ESCADA</option>
              <option value="IPOJUCA">IPOJUCA</option>
              <option value="RIBEIRAO">RIBEIRÃO</option>
              <option value="SAO JOSE">SÃO JOSÉ</option>
              <option value="CATENDE">CATENDE</option>
              <option value="XEXEU">XEXEU</option>
              <option value="MARAGOGI">MARAGOGI</option>
              <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
              <option value="OUTRAS CIDADES">DISTRI VALTER</option>
              <option value="CHA GRANDE">Cha grande</option>
              <option value="TENDA">Tenda</option>
            </select>

            <select value={localRetirada} onChange={(e) => setLocalRetirada(e.target.value)}>
              <option value="">Local de retirada</option>
              <option value="FILIAL">Retirada em filial</option>
              <option value="ENTREGA">Entrega</option>
            </select>

            {localRetirada === "FILIAL" && ( <select value={filialRetirada} onChange={(e) => setFilialRetirada(e.target.value)}>
              <option value="">Filial de retirada</option>
              <option value="ESCADA">ESCADA</option>
              <option value="IPOJUCA">IPOJUCA</option>
              <option value="RIBEIRAO">RIBEIRÃO</option>
              <option value="SAO JOSE">SÃO JOSÉ</option>
              <option value="CATENDE">CATENDE</option>
              <option value="XEXEU">XEXEU</option>
              <option value="MARAGOGI">MARAGOGI</option>
              <option value="IPOJUCA RICARDO">Ipojuca Ricardo</option>
              <option value="CHA GRANDE">Cha grande</option>
              <option value="TENDA">Tenda</option>
            </select>                               
              )}                           

            <label>
              <input type="checkbox" checked={brinde} onChange={(e) => setBrinde(e.target.checked)} /> Brinde
            </label>

            <input type="number" placeholder="Gasolina (opcional)" value={gasolina} onChange={(e) => setGasolina(e.target.value)} />

            <input placeholder="Número cliente" value={numeroCliente} onChange={(e) => setNumeroCliente(e.target.value)} />

            <input placeholder="Forma de pagamento" value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} />

            <select value={comoChegou} onChange={(e) => setComoChegou(e.target.value)}>
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

      {/* ================= MODAL TRANSFERIR PEÇA ================= */}
      {pecaTransferir && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>🔄 Transferir Peça</h3>
            <p>
              <strong>{pecaTransferir.nome}</strong>
            </p>
            <p>Origem: {pecaTransferir.cidade}</p>

            <input type="number" placeholder="Quantidade" value={quantidadeTransferir} onChange={(e) => setQuantidadeTransferir(e.target.value)} />

            <select value={cidadeDestino} onChange={(e) => setCidadeDestino(e.target.value)}>
              <option value="">Filial destino</option>
              <option value="ESCADA">Escada</option>
              <option value="IPOJUCA">Ipojuca</option>
              <option value="RIBEIRAO">Ribeirão</option>
              <option value="SAO JOSE">São José</option>
              <option value="CATENDE">Catende</option>
              <option value="XEXEU">Xexeu</option>
              <option value="MARAGOGI">MARAGOGI</option>
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

      {/* ================= MODAL TRANSFERIR MOTO ================= */}
      {motoTransferir && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>🔄 Transferir Moto</h3>

            <p>
              <strong>{motoTransferir.modelo}</strong>
            </p>
            <p>Chassi: {motoTransferir.chassi}</p>
            <p>Origem: {motoTransferir.filial}</p>

            <select value={filialDestinoMoto} onChange={(e) => setFilialDestinoMoto(e.target.value)}>
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

      {/* ================= MODAL CADASTRAR PEÇA ================= */}
      {modalCadastrar && user.role === "DIRETORIA" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Cadastrar</h3>

            <input placeholder="Nome" value={nomePeca} onChange={(e) => setNomePeca(e.target.value)} />

            <input type="number" placeholder="Valor" value={valorPeca} onChange={(e) => setValorPeca(e.target.value)} />

            <select value={filialPeca} onChange={(e) => setFilialPeca(e.target.value)}>
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
              <button onClick={cadastrarPeca}>Salvar</button>
              <button onClick={() => setModalCadastrar(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

{pecaEntrada && (
  <div className="modal-overlay">
    <div className="modal">
      <h3>➕ Adicionar estoque</h3>

      <p>
        <strong>{pecaEntrada.nome}</strong>
      </p>
      <p>Filial: {pecaEntrada.cidade}</p>
      <p>Estoque atual: {pecaEntrada.estoque}</p>

      <input
        type="number"
        placeholder="Quantidade a adicionar"
        value={quantidadeEntrada}
        onChange={(e) => setQuantidadeEntrada(e.target.value)}
      />

      <input
        type="number"
        placeholder="Preço unitário"
        value={precoEntrada}
        onChange={(e) => setPrecoEntrada(e.target.value)}
      />

      <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
        <button onClick={confirmarEntradaEstoque}>Salvar</button>
        <button onClick={() => setPecaEntrada(null)}>Cancelar</button>
      </div>
    </div>
  </div>
)}

      {/* ================= MODAL CADASTRAR MOTO ================= */}
      {modalCadastrarMoto && user.role === "DIRETORIA" && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Cadastrar Moto</h3>

            {/* ✅ MODELO (SELECT) + AUTO COMPRA/SANTANDER + (se filial exigir repasse, seta) */}
            <select
              value={modeloMoto}
              onChange={(e) => {
                const novoModelo = e.target.value;
                setModeloMoto(novoModelo);

                const cfg = MODELOS_MOTOS.find((m) => m.modelo === novoModelo);
                if (!cfg) {
                  setSantanderMoto(false);
                  setValorCompra("");
                  return;
                }

                setSantanderMoto(!!cfg.santanderDefault);
                const compra = cfg.santanderDefault ? cfg.compra_santander : cfg.compra_motonow;
                setValorCompra(String(compra));

                // ✅ se filial exige repasse, seta automático
                if (isRepasseObrigatorio(filialMoto)) {
                  const r = repassePorModelo(novoModelo);
                  if (typeof r === "number") setRepasse(String(r));
                }
              }}
            >
              <option value="">Selecione o modelo</option>
              {MODELOS_MOTOS.map((m) => (
                <option key={m.modelo} value={m.modelo}>
                  {m.modelo}
                </option>
              ))}
            </select>

            <input placeholder="Cor" value={corMoto} onChange={(e) => setCorMoto(e.target.value)} />

            <input placeholder="Chassi" value={chassiMoto} onChange={(e) => setChassiMoto(e.target.value)} />

            <input placeholder="Ano" value={anoMoto} onChange={(e) => setAnoMoto(e.target.value)} />

            <input type="number" placeholder="Valor compra" value={valorCompra} onChange={(e) => setValorCompra(e.target.value)} />

            {/* ✅ Repasse: trava quando filial exige */}
            <input
              type="number"
              placeholder="Valor Repasse"
              value={repasse}
              disabled={isRepasseObrigatorio(filialMoto)}
              onChange={(e) => setRepasse(e.target.value)}
            />

            <select
              value={filialMoto}
              onChange={(e) => {
                const f = e.target.value;
                setFilialMoto(f);

                // ✅ se filial exige repasse, seta automático
                if (isRepasseObrigatorio(f)) {
                  const r = repassePorModelo(modeloMoto);
                  if (typeof r === "number") setRepasse(String(r));
                }
              }}
            >
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
              <option value="TENDA">Tenda</option>
            </select>

            <input placeholder="CNPJ da empresa" value={cnpjEmpresa} onChange={(e) => setCnpjEmpresa(e.target.value)} />

            {/* ✅ checkbox controla o valor_compra */}
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={santanderMoto}
                onChange={(e) => {
                  const isSant = e.target.checked;
                  setSantanderMoto(isSant);

                  const cfg = MODELOS_MOTOS.find((m) => m.modelo === modeloMoto);
                  if (!cfg) return;

                  const compra = isSant ? cfg.compra_santander : cfg.compra_motonow;
                  setValorCompra(String(compra));
                }}
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
