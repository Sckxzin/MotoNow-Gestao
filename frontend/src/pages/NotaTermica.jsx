import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import "./NotaTermica.css";

export default function NotaTermica() {
  const [params] = useSearchParams();
  const [dados, setDados] = useState(null);

  const id = params.get("id");

  useEffect(() => {
    if (!id) return;

    api.get(`/nota-fiscal/${id}`)
      .then((res) => setDados(res.data))
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar nota");
      });
  }, [id]);

  if (!dados) return <div>Carregando...</div>;

  const { venda, itens } = dados;

  return (
    <div className="nota-termica">
      <div className="nota-central">
        <strong>MotoNow</strong>
        <div>Comprovante de Venda</div>
      </div>

      <div className="nota-linha"></div>

      <div><strong>Cliente:</strong> {venda.cliente_nome}</div>
      <div><strong>Telefone:</strong> {venda.cliente_telefone}</div>
      <div><strong>Data:</strong> {new Date(venda.created_at).toLocaleString("pt-BR")}</div>
      <div><strong>Pagamento:</strong> {venda.forma_pagamento}</div>
      <div><strong>Cidade:</strong> {venda.cidade}</div>

      <div className="nota-linha"></div>

      {itens.map((item, i) => (
        <div key={i} style={{ marginBottom: 6 }}>
          <div><strong>{item.nome}</strong></div>
          <div className="nota-item">
            <span>{item.quantidade} x {Number(item.preco_unitario).toFixed(2)}</span>
            <span>
              R$ {(Number(item.quantidade) * Number(item.preco_unitario)).toFixed(2)}
            </span>
          </div>
        </div>
      ))}

      <div className="nota-linha"></div>

      <div><strong>Total:</strong> R$ {Number(venda.total).toFixed(2)}</div>

      {venda.observacao && (
        <>
          <div className="nota-linha"></div>
          <div><strong>Obs:</strong> {venda.observacao}</div>
        </>
      )}

      <div className="nota-linha"></div>

      <div className="nota-central">
        Obrigado pela preferência
      </div>

      <div className="ocultar-print">
        <button onClick={() => window.print()}>Imprimir</button>
      </div>
    </div>
  );
}