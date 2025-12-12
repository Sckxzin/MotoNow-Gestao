import "./NotaFiscal.css";
import { useEffect, useState } from "react";

export default function NotaFiscal() {
  const [venda, setVenda] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("notaFiscal");

    if (saved) {
      try {
        setVenda(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao processar nota:", e);
      }
    }
  }, []);

  if (!venda) {
    return <h2 style={{ padding: 30 }}>Nenhuma venda carregada.</h2>;
  }

  return (
    <div className="nf-container">

      {/* TOPO */}
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

      {/* CLIENTE */}
      <h3 className="nf-section">DADOS DO CLIENTE</h3>
      <div className="nf-box">
        <p><b>Nome:</b> {venda.nome_cliente}</p>
        <p><b>CPF:</b> {venda.cpf}</p>
        <p><b>Telefone:</b> {venda.telefone}</p>
      </div>

      {/* PEÇA */}
      <h3 className="nf-section">PEÇA VENDIDA</h3>
      <div className="nf-box">
        <p><b>Descrição:</b> {venda.peca}</p>
        <p><b>Código:</b> {venda.codigo}</p>
        <p><b>Quantidade:</b> {venda.quantidade}</p>
      </div>

      {/* VALORES */}
      <h3 className="nf-section">VALORES</h3>
      <div className="nf-box">
        <p><b>Preço Unitário:</b> R$ {venda.preco_unitario}</p>
        <p><b>Total:</b> <b>R$ {venda.total}</b></p>
      </div>

      <button className="nf-print" onClick={() => window.print()}>
        🖨 Imprimir Nota Fiscal
      </button>

    </div>
  );
}
