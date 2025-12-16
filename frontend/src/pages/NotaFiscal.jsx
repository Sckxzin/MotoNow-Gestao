import "./NotaFiscal.css";
import { useEffect, useState } from "react";

export default function NotaFiscal() {
  const [nota, setNota] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("notaFiscal");
    if (saved) {
      try {
        setNota(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar nota:", e);
      }
    }
  }, []);

  if (!nota) {
    return <h2 style={{ padding: 30 }}>Nenhuma venda carregada.</h2>;
  }

  const isMultipla = Array.isArray(nota.itens);

  return (
    <div className="nf-container">

      {/* ===== TOPO ===== */}
      <div className="nf-header">
        <div className="nf-line"></div>

        <p className="nf-identificacao">IDENTIFICAÇÃO DO EMITENTE</p>

        <div className="nf-logos">
          <img src="/logo-shineray.png" alt="Shineray" />
          <img src="/logo-motonow.png" alt="MotoNow" />
        </div>

        <h2 className="nf-title">MOTONOW COMÉRCIO DE MOTOCICLETA LTDA</h2>
        <p className="nf-text">
          AV COMENDADOR JOSE PEREIRA, 695 <br />
          MARACUJÁ — 55500-000 <br />
          Escada - PE • Telefone/Fax: (81) 99302-4733
        </p>

        <div className="nf-line"></div>
      </div>

      {/* ===== CLIENTE ===== */}
      <h3 className="nf-section">DADOS DO CLIENTE</h3>
      <div className="nf-box">
        <p><b>Nome:</b> {nota.cliente?.nome || nota.nome_cliente || "—"}</p>
        <p><b>CPF:</b> {nota.cliente?.cpf || nota.cpf || "—"}</p>
        <p><b>Telefone:</b> {nota.cliente?.telefone || nota.telefone || "—"}</p>
      </div>

      {/* ===== LISTA DE ITENS ===== */}
      <h3 className="nf-section">ITENS VENDIDOS</h3>
      <div className="nf-box">

        {/* VENDA MÚLTIPLA */}
        {isMultipla ? (
          <table className="nf-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Código</th>
                <th>Qtd</th>
                <th>Unitário</th>
                <th>Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {nota.itens.map((item, i) => (
                <tr key={i}>
                  <td>{item.nome}</td>
                  <td>{item.codigo}</td>
                  <td>{item.quantidade}</td>
                  <td>R$ {item.preco_unitario.toFixed(2)}</td>
                  <td>R$ {item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            {/* VENDA SIMPLES */}
            <p><b>Descrição:</b> {nota.peca || "—"}</p>
            <p><b>Código:</b> {nota.codigo || "—"}</p>
            <p><b>Quantidade:</b> {nota.quantidade || 0}</p>
          </>
        )}

      </div>

      {/* ===== VALORES ===== */}
      <h3 className="nf-section">VALORES</h3>
      <div className="nf-box">
        {isMultipla ? (
          <>
            <p><b>Total Geral:</b> <strong>R$ {nota.total.toFixed(2)}</strong></p>
          </>
        ) : (
          <>
            <p><b>Preço Unitário:</b> R$ {Number(nota.preco_unitario).toFixed(2)}</p>
            <p><b>Total:</b> <strong>R$ {Number(nota.total).toFixed(2)}</strong></p>
          </>
        )}
      </div>

      {/* ===== BOTÃO ===== */}
      <button className="nf-print" onClick={() => window.print()}>
        🖨 Imprimir Nota Fiscal
      </button>

    </div>
  );
}
