// src/pages/VendasMotos.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export default function VendasMotos() {
  const nav = useNavigate();
  const [vendas, setVendas] = useState([]);

function exportarCSV(nomeArquivo, headers, dados) {
  const csv = [
    headers.join(";"),
    ...dados.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(";")
    )
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}
function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
  // 🔹 filtros
  const [empresaFiltro, setEmpresaFiltro] = useState("TODAS");
  const [cidadeFiltro, setCidadeFiltro] = useState("TODAS");
const [mesFiltro, setMesFiltro] = useState("");

  useEffect(() => {
    api
      .get("/vendas-motos")
      .then(res => {
        setVendas(res.data || []);
      })
      .catch(err => {
        console.error("Erro histórico motos:", err);
        alert("Erro ao carregar histórico de motos");
      });
  }, []);

  // 🔹 normaliza empresa
  function getEmpresa(v) {
    return v.santander === true || v.santander === "SIM"
      ? "EMENEZES"
      : "MOTONOW";
  }

  // 🔹 vendas filtradas
  const vendasFiltradas = useMemo(() => {
  return vendas.filter(v => {
    const empresa = getEmpresa(v);

    const okEmpresa =
      empresaFiltro === "TODAS" || empresa === empresaFiltro;

    const okCidade =
      cidadeFiltro === "TODAS" || v.filial_venda === cidadeFiltro;

    const okMes =
      !mesFiltro ||
      new Date(v.created_at).toISOString().slice(0, 7) === mesFiltro;

    return okEmpresa && okCidade && okMes;
  });
}, [vendas, empresaFiltro, cidadeFiltro, mesFiltro]);

  // 🔹 totais por empresa
  const totalEmpresa = useMemo(() => {
    let emenezes = 0;
    let motonow = 0;

    vendasFiltradas.forEach(v => {
      if (getEmpresa(v) === "EMENEZES") emenezes += Number(v.valor);
      else motonow += Number(v.valor);
    });

    return { emenezes, motonow };
  }, [vendasFiltradas]);

  return (
    <div style={{ padding: 20 }}>
      <h2>🏍 Histórico de Vendas de Motos</h2>

      <button onClick={() => nav("/home")}>⬅ Voltar</button>

      {/* ===== FILTROS ===== */}
      <div className="filtros-historico" style={{ display: "flex", gap: 10, marginBottom: 15 }}>
  
  <select
    value={empresaFiltro}
    onChange={e => setEmpresaFiltro(e.target.value)}
  >
    <option value="TODAS">Todas Empresas</option>
    <option value="EMENEZES">Emenezes</option>
    <option value="MOTONOW">MotoNow</option>
  </select>

  <select
    value={cidadeFiltro}
    onChange={e => setCidadeFiltro(e.target.value)}
  >
    <option value="TODAS">Todas Cidades</option>
    <option value="ESCADA">Escada</option>
    <option value="IPOJUCA">Ipojuca</option>
    <option value="RIBEIRAO">Ribeirão</option>
    <option value="SAO JOSE">São José</option>
    <option value="CATENDE">Catende</option>
    <option value="XEXEU">Xexeu</option>
  </select>

  <input
    type="month"
    value={mesFiltro}
    onChange={e => setMesFiltro(e.target.value)}
  />

</div>

      {/* ===== TOTAIS ===== */}
      <div style={{ marginBottom: 20, display: "flex", gap: 20 }}>
        <div>
          <strong>🏢 EMENEZES</strong><br />
          R$ {totalEmpresa.emenezes.toFixed(2)}
        </div>

        <div>
          <strong>🏢 MOTONOW</strong><br />
          R$ {totalEmpresa.motonow.toFixed(2)}
        </div>
      </div>
<div className="filtros-historico">
  <select
    className="select-filial"
    value={cidadeFiltro}
    onChange={e => setCidadeFiltro(e.target.value)}
  >
    <option value="TODAS">Todas as cidades</option>
    <option value="ESCADA">Escada</option>
    <option value="IPOJUCA">Ipojuca</option>
    <option value="RIBEIRAO">Ribeirão</option>
    <option value="SAO JOSE">São José</option>
    <option value="CATENDE">Catende</option>
    <option value="XEXEU">Xexeu</option>
  </select>

  <input
    type="month"
    className="input-busca"
    value={mesFiltro}
    onChange={e => setMesFiltro(e.target.value)}
  />
</div>

<button
  onClick={() =>
    exportarCSV(
      "historico_vendas_motos.csv",
      [
        "modelo",
        "cor",
        "chassi",
        "nome_cliente",
        "valor",
        "forma_pagamento",
        "filial_venda",
        "empresa",
        "brinde",
        "created_at"
      ],
      vendasFiltradas.map(v => ({
        modelo: v.modelo,
        cor: v.cor,
        chassi: v.chassi,
        nome_cliente: v.nome_cliente,
        valor: v.valor,
        forma_pagamento: v.forma_pagamento,
        filial_venda: v.filial_venda,
        empresa: getEmpresa(v),
        brinde: v.brinde ? "SIM" : "NÃO",
        created_at: new Date(v.created_at).toLocaleDateString("pt-BR")
      }))
    )
  }
>
  📥 Exportar Histórico de Motos
</button>

      {/* ===== TABELA ===== */}
      {vendasFiltradas.length === 0 ? (
        <p>Nenhuma venda encontrada.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Cor</th>
              <th>Chassi</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Gasolina</th>
              <th>Filial</th>
              <th>Empresa</th>
              <th>Brinde</th>
              <th>Data</th>
            </tr>
          </thead>

          <tbody>
            {vendasFiltradas.map(v => (
              <tr key={v.id}>
                <td>{v.modelo}</td>
                <td>{v.cor}</td>
                <td>{v.chassi}</td>
                <td>{v.nome_cliente}</td>

               <td>{formatarValor(v.valor)}</td>
                <td>{v.forma_pagamento}</td>

                <td>
                  {v.gasolina
                    ? `R$ ${Number(v.gasolina).toFixed(2)}`
                    : "-"}
                </td>

                <td>{v.filial_venda}</td>

                <td>{getEmpresa(v)}</td>

                <td>{v.brinde ? "SIM" : "NÃO"}</td>

                <td>
                  {new Date(v.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
