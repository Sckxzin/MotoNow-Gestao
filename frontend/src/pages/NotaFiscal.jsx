import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import "./NotaFiscal.css";

export default function NotaFiscal() {
  const nav = useNavigate();
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("id");

  const [nota, setNota] = useState(null);

  useEffect(() => {
    api
      .get(`/nota-fiscal/${id}`)
      .then(res => setNota(res.data))
      .catch(() => alert("Erro ao carregar nota fiscal"));
  }, [id]);

  if (!nota) return null;

  const { venda, itens } = nota;

  /* ================= FILIAIS ================= */
  const filiais = {
    ESCADA: {
      nome: "MOTONOW COMÉRCIO DE MOTOCICLETAS LTDA",
      endereco: "Av. Comendador José Pereira, 695",
      cidade: "Escada - PE",
      telefone: "(81) 99302-4733",
      cnpj: "61.065.883/0001-02",
    },
    IPOJUCA: {
      nome: "MOTONOW COMÉRCIO MOTOS",
      endereco: "R. Um, 67 - Nossa Sra. do O",
      cidade: "Ipojuca - PE",
      telefone: "(81) 99245-9495",
      cnpj: "58.021.497/0001-04",
    },
    SAOJOSE: {
     nome: "LITORAL MOTO CENTER SHINERAY LTDA",
     endereco: "PE-060, 60",
     cidade: "São José da Coroa Grande",
     telefone: "(81) 97103-8812",
     cnpj: "62.619.032/0001-27",
    },
  
  };

  // normaliza para evitar erro por espaço ou maiúscula/minúscula
  const chaveFilial = (venda.cidade || "").trim();
  const filialInfo = filiais[chaveFilial] || filiais.Escada;

  return (
    <div className="nf-container">
      {/* HEADER */}
      <div className="nf-header">
        <div className="nf-identificacao">
          IDENTIFICAÇÃO DO EMITENTE
        </div>

        <div className="nf-title">
          {filialInfo.nome}
        </div>

        <div className="nf-text">
          {filialInfo.endereco}<br />
          {filialInfo.cidade} • Tel: {filialInfo.telefone}<br />
          CNPJ: {filialInfo.cnpj}
        </div>
      </div>

      <div className="nf-line" />

      {/* DADOS DO CLIENTE */}
      <div className="nf-section">DADOS DO CLIENTE</div>
      <div className="nf-box">
        <p><strong>Nome:</strong> {venda.cliente_nome}</p>
        <p><strong>Telefone:</strong> {venda.cliente_telefone || "-"}</p>
        <p><strong>Chassi:</strong> {venda.chassi_moto || "-"}</p>
      </div>

      {/* ITENS */}
      <div className="nf-section">ITENS DA VENDA</div>
      <table className="nf-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th>Qtd</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i, idx) => (
            <tr key={idx}>
              <td>{i.codigo || "0001"}</td>
              <td>{i.nome}</td>
              <td>{i.quantidade}</td>
              <td>R$ {Number(i.preco_unitario).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* VALORES */}
      <div className="nf-section">VALORES</div>
      <div className="nf-box">
        <p><strong>Total:</strong> R$ {Number(venda.total).toFixed(2)}</p>
        <p><strong>Forma de Pagamento:</strong> {venda.forma_pagamento}</p>
        <p>
          <strong>Data da Venda:</strong>{" "}
          {new Date(venda.created_at).toLocaleString("pt-BR")}
        </p>
      </div>

      {/* OBSERVAÇÕES */}
      {venda.observacao && (
        <>
          <div className="nf-section">OBSERVAÇÕES</div>
          <div className="nf-box">
            <p>{venda.observacao}</p>
          </div>
        </>
      )}

      {/* AÇÕES */}
      <button className="nf-print" onClick={() => window.print()}>
        🖨 Imprimir Nota
      </button>

      <button
        className="nf-print"
        style={{ background: "#555", marginTop: 10 }}
        onClick={() => nav(-1)}
      >
        ⬅ Voltar
      </button>
    </div>
  );
}
