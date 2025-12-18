import "./NotaFiscal.css";
import { useEffect, useState } from "react";

export default function NotaFiscal() {
  const [nota, setNota] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("notaFiscal");
    if (saved) {
      try {
        setNota(JSON.parse(saved));
      } catch {
        setNota(null);
      }
    }
  }, []);

  if (!nota) {
    return <h2 style={{ padding: 30 }}>Nenhuma nota fiscal encontrada.</h2>;
  }

  return (
    <div className="nf-container">

      {/* ===== CABEÇALHO ===== */}
      <div className="nf-header">
        <div className="nf-line"></div>

        <div className="nf-logos">
          <img src="/logo-shineray.png" alt="Shineray" />
          <img src="/logo-motonow.png" alt="MotoNow" />
        </div>

        <h2 className="nf-title">MOTONOW COMÉRCIO DE MOTOCICLETAS LTDA</h2>
        <p className="nf-text">
          Av. Comendador José Pereira, 695<br />
          Escada - PE • (81) 99302-4733
        </p>

        <div className="nf-line"></div>
      </div>

      {/* ===== DADOS DA VENDA ===== */}
      <h3 className="nf-section">DADOS DA VENDA</h3>
      <div className="nf-box">
        <p><b>Nº Venda:</b> {nota.venda_id}</p>
        <p><b>Data:</b> {nota.data}</p>
        <p><b>Filial:</b> {nota.filial}</p>
        <p><b>Forma de Pagamento:</b> {nota.forma_pagamento}</p>
      </div>

      {/* ===== CLIENTE ===== */}
      <h3 className="nf-section">DADOS DO CLIENTE</h3>
      <div className="nf-box">
        <p><b>Nome:</b> {nota.cliente.nome}</p>
        <p><b>CPF:</b> {nota.cliente.cpf}</p>
        <p><b>Telefone:</b> {nota.cliente.telefone || "—"}</p>
      </div>

      {/* ===== ITENS ===== */}
      <h3 className="nf-section">ITENS VENDIDOS</h3>
      <table className="nf-table">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Código</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {nota.itens.map((i, idx) => (
            <tr key={idx}>
              <td>{i.nome}</td>
              <td>{i.codigo}</td>
              <td>{i.quantidade}</td>
              <td>R$ {Number(i.preco_unitario).toFixed(2)}</td>
              <td>R$ {Number(i.subtotal).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== TOTAL ===== */}
      <div className="nf-total">
        <h2>Total Geral: R$ {Number(nota.total).toFixed(2)}</h2>
      </div>

      {/* ===== ASSINATURA ===== */}
      <div className="nf-sign">
        <p>______________________________________________</p>
        <p>Assinatura do Cliente</p>
      </div>

      {/* ===== BOTÃO ===== */}
      <button className="nf-print" onClick={() => window.print()}>
        🖨 Imprimir Nota Fiscal
      </button>
    </div>
  );
}
