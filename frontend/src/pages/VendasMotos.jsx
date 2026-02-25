import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "./VendasMotos.css";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);

  /* ================= HELPERS ================= */
  function formatarValor(valor) {
    if (valor == null || valor === "" || Number.isNaN(Number(valor))) return "-";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

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

function getValorARepassar(v) {
  if (v.repasse == null || v.repasse === "" || Number.isNaN(Number(v.repasse))) {
    return null; // não calcula se não tiver repasse
  }

  const repasse = Number(v.repasse);
  const valorVenda = Number(v.valor || 0);

  return valorVenda - repasse;
function calcLiquido(v) {
  const valor = Number(v.valor || 0);
  const compra = Number(v.valor_compra || 0);
  const repasse = Number(v.repasse || 0);
  const gasolina = Number(v.gasolina || 0);
  const descontoBrinde = v.brinde ? 100 : 0;

  // se tiver repasse, ele "substitui" a compra (pra não subtrair 2x)
  const base = repasse > 0 ? repasse : compra;

  return valor - base - gasolina - descontoBrinde;
}
  /* ================= FILTROS ================= */
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");

  // ✅ multi-cidades
  const [cidadesFiltro, setCidadesFiltro] = useState([]); // array

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // ✅ busca por chassi/modelo/cliente
  const [buscaChassi, setBuscaChassi] = useState("");

  /* ================= CIDADES PADRÃO ================= */
  const cidadesPadrao = [
    "ESCADA",
    "IPOJUCA",
    "RIBEIRAO",
    "SAO JOSE",
    "CATENDE",
    "XEXEU",
    "MARAGOGI",
    "IPOJUCA RICARDO",
    "CHA GRANDE"
  ];

  /* ================= LOAD ================= */
  useEffect(() => {
    api
      .get("/vendas-motos")
      .then(res => setVendas(res.data || []))
      .catch(() => alert("Erro ao carregar vendas"));
  }, []);

  /* ================= EMPRESA ================= */
  function getEmpresa(v) {
    return v.santander === true || v.santander === "SIM" ? "EMENEZES" : "MOTONOW";
  }

  function getCNPJ(v) {
    if (v.santander === true || v.santander === "SIM") return "-";
    return v.cnpj_empresa || "-";
  }

  /* ================= BOTÕES RÁPIDOS ================= */
  function aplicarHoje() {
    const hoje = new Date().toISOString().slice(0, 10);
    setDataInicio(hoje);
    setDataFim(hoje);
  }

  function aplicar7Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 7);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicar30Dias() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 30);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicarMesAtual() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function aplicarMesPassado() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    setDataInicio(inicio.toISOString().slice(0, 10));
    setDataFim(fim.toISOString().slice(0, 10));
  }

  function limparDatas() {
    setDataInicio("");
    setDataFim("");
  }

  function limparCidades() {
    setCidadesFiltro([]);
  }

  function limparBusca() {
    setBuscaChassi("");
  }

  /* ================= FILTRAGEM ================= */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(v => {
      const empresa = getEmpresa(v);
      const dataVenda = new Date(v.created_at);

      const okEmpresa = empresaFiltro === "TODAS" || empresa === empresaFiltro;

      const okCidade = (() => {
        // nada selecionado ou TODAS
        if (cidadesFiltro.length === 0 || cidadesFiltro.includes("TODAS")) return true;

        const filial = (v.filial_venda || "").trim();

        // SEM_CIDADE
        if (cidadesFiltro.includes("SEM_CIDADE") && filial === "") return true;

        // OUTRAS
        if (cidadesFiltro.includes("OUTRAS")) {
          if (filial !== "" && !cidadesPadrao.includes(filial)) return true;
        }

        // cidades específicas
        const cidadesEspecificas = cidadesFiltro.filter(
          x => x !== "SEM_CIDADE" && x !== "OUTRAS" && x !== "TODAS"
        );

        if (cidadesEspecificas.length > 0 && cidadesEspecificas.includes(filial)) return true;

        return false;
      })();

      const okInicio = !dataInicio || dataVenda >= new Date(dataInicio);
      const okFim = !dataFim || dataVenda <= new Date(`${dataFim}T23:59:59`);

      const okBusca = (() => {
        if (!buscaChassi.trim()) return true;
        const termo = buscaChassi.trim().toLowerCase();

        const chassi = (v.chassi || "").toLowerCase();
        const modelo = (v.modelo || "").toLowerCase();
        const cliente = (v.nome_cliente || "").toLowerCase();

        return chassi.includes(termo) || modelo.includes(termo) || cliente.includes(termo);
      })();

      return okEmpresa && okCidade && okInicio && okFim && okBusca;
    });
  }, [vendas, empresaFiltro, cidadesFiltro, dataInicio, dataFim, buscaChassi]);

  /* ================= TOTAIS ================= */
  const totalEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor);
      else motonow += Number(v.valor);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  const totalGeralMotos = vendasFiltradas.length;

const totalARepassarPorEmpresa = useMemo(() => {
  let emenezes = 0;
  let motonow = 0;

  vendasFiltradas.forEach(v => {
    const valorARepassar = getValorARepassar(v);

    if (valorARepassar == null) return;

    if (getEmpresa(v) === "EMENEZES") {
      emenezes += valorARepassar;
    } else {
      motonow += valorARepassar;
    }
  });

  return { emenezes, motonow };
}, [vendasFiltradas]);

const totalLucroPorEmpresa = useMemo(() => {
  let emenezes = 0;
  let motonow = 0;

  vendasFiltradas.forEach(v => {
    const lucro = getLucroReal(v);

    if (getEmpresa(v) === "EMENEZES") {
      emenezes += lucro;
    } else {
      motonow += lucro;
    }
  });

  return { emenezes, motonow };
}, [vendasFiltradas]);
  /* ================= UI ================= */
  return (
    <div className="vendas-motos-container">
      <h2>🏍 Histórico de Vendas de Motos</h2>

      <button className="btn-voltar" onClick={() => nav("/home")}>
        ⬅ Voltar
      </button>

      {/* FILTROS */}
      <div className="filtros">
        <select value={empresaFiltro} onChange={e => setEmpresaFiltro(e.target.value)}>
          <option value="TODAS">Todas Empresas</option>
          <option value="EMENEZES">Emenezes</option>
          <option value="MOTONOW">MotoNow</option>
        </select>

        {/* ✅ MULTI-CIDADES (Ctrl/Shift no PC) */}
        <select
          multiple
          value={cidadesFiltro}
          onChange={e => {
            const selecionadas = Array.from(e.target.selectedOptions).map(o => o.value);
            setCidadesFiltro(selecionadas);
          }}
          style={{ height: 160 }}
          title="Segure Ctrl (ou Shift) para selecionar várias"
        >
          <option value="TODAS">Todas Cidades</option>

          {cidadesPadrao.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}

          <option value="OUTRAS">Outras cidades</option>
          <option value="SEM_CIDADE">Sem cidade</option>
        </select>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <button type="button" onClick={limparCidades}>
            Limpar cidades
          </button>
        </div>

        <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />

    

        <button type="button" onClick={limparBusca}>
          Limpar busca
        </button>
      </div>

      {/* BOTÕES */}
      <div className="botoes-rapidos">
        <button onClick={aplicarHoje}>Hoje</button>
        <button onClick={aplicar7Dias}>7 dias</button>
        <button onClick={aplicar30Dias}>30 dias</button>
        <button onClick={aplicarMesAtual}>Mês atual</button>
        <button onClick={aplicarMesPassado}>Mês passado</button>
        <button onClick={limparDatas}>Limpar datas</button>
      </div>

      {/* RESUMO */}
      <div className="resumo">
  <strong>🏢 EMENEZES: {formatarValor(totalEmpresa.emenezes)}</strong>
  <strong>🏢 MOTONOW: {formatarValor(totalEmpresa.motonow)}</strong>
  <strong>🧮 Total: {totalGeralMotos} motos</strong>

  <hr style={{ width: "100%" }} />

  <strong>💸 A repassar EMENEZES: {formatarValor(totalARepassarPorEmpresa.emenezes)}</strong>
  <strong>💸 A repassar MOTOCENTER/LITORAL: {formatarValor(totalARepassarPorEmpresa.motonow)}</strong>
</div>

<hr style={{ width: "100%" }} />

<strong>📈 Lucro EMENEZES: {formatarValor(totalLucroPorEmpresa.emenezes)}</strong>
<strong>📈 Lucro MOTONOW: {formatarValor(totalLucroPorEmpresa.motonow)}</strong>
      

      {/* EXPORTAR CSV */}
      <button
        className="btn-exportar"
        onClick={() =>
          exportarCSV(
            "historico_vendas_motos.csv",
            [
              "modelo",
              "cor",
              "chassi",
              "cliente",
              "telefone",
              "origem",
              "valor",
              "valor_compra",
              "repasse",
              "pagamento",
              "gasolina",
              "filial",
              "empresa",
              "cnpj",
              "brinde",
              "data"
            ],
            vendasFiltradas.map(v => ({
              modelo: v.modelo,
              cor: v.cor,
              chassi: v.chassi,
              cliente: v.nome_cliente,
              telefone: v.numero_cliente,
              origem: v.como_chegou,
              valor: v.valor != null ? Number(v.valor).toFixed(2) : "",
              valor_compra: v.valor_compra != null ? Number(v.valor_compra).toFixed(2) : "",
              repasse: v.repasse != null ? Number(v.repasse).toFixed(2) : "",
              pagamento: v.forma_pagamento,
              gasolina: v.gasolina != null ? Number(v.gasolina).toFixed(2) : "",
              filial: v.filial_venda || "",
              empresa: getEmpresa(v),
              cnpj: getCNPJ(v),
              brinde: v.brinde ? "SIM" : "NÃO",
              data: new Date(v.created_at).toLocaleDateString("pt-BR")
            }))
          )
        }
      >
        📥 Exportar CSV
      </button>

       {/* ✅ BUSCA */}
        <input
          className="input-busca"
          placeholder="Buscar por chassi, modelo ou cliente..."
          value={buscaChassi}
          onChange={e => setBuscaChassi(e.target.value)}
        />

      {/* TABELA */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Origem</th>
              <th>Valor</th>
              <th>Valor de compra</th>
              <th>Repasse</th>
              <th>Pagamento</th>
              <th>Gasolina</th>
              <th>Filial</th>
              <th>Empresa</th>
              <th>CNPJ</th>
              <th>Brinde</th>
              <th>Data</th>
              <th>A repassar</th>
              <th>Líquido</th>

            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map(v => (
              <tr key={v.id}>
                <td>{v.modelo}</td>
                <td>{v.cor}</td>
                <td>{v.chassi}</td>
                <td>{v.nome_cliente}</td>
                <td>{v.numero_cliente}</td>
                <td>{v.como_chegou}</td>
                <td>{formatarValor(v.valor)}</td>
                <td>{formatarValor(v.valor_compra)}</td>
                <td>{formatarValor(v.repasse)}</td>
                <td>{v.forma_pagamento}</td>
                <td>{v.gasolina ? formatarValor(v.gasolina) : "-"}</td>
                <td>{v.filial_venda || "-"}</td>
                <td>{getEmpresa(v)}</td>
                <td>{getCNPJ(v)}</td>
                <td>{v.brinde ? "SIM" : "NÃO"}</td>
                <td>{new Date(v.created_at).toLocaleDateString("pt-BR")}</td>
                <td>
  {getValorARepassar(v) == null
    ? "-"
    : formatarValor(getValorARepassar(v))}
</td>
<td>{formatarValor(calcLiquido(v))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
