import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../api";
import "./NotaFiscal.css";

export default function NotaTermica() {
  const [params] = useSearchParams();
  const [dados, setDados] = useState(null);
  const nav = useNavigate();

  const id = params.get("id");

  useEffect(() => {
    if (!id) return;

    api
      .get(`/nota-fiscal/${id}`)
      .then((res) => setDados(res.data))
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar nota");
      });
  }, [id]);

  if (!dados) return <div style={{ padding: 20 }}>Carregando...</div>;

  const { venda, itens } = dados;

  return (
    <div className="nota-root">
      <div className="nota-acoes no-print">
        <button onClick={() => nav(-1)} className="btn-voltar-nota">
          ← Voltar
        </button>

        <button onClick={() => window.print()} className="btn-imprimir-nota">
          Imprimir
        </button>
      </div>

      <div className="nota-termica">
        <div className="nota-topo">
          <div className="empresa">MotoNow</div>
          <div className="subtitulo">Comprovante de Venda</div>
        </div>

        <div className="linha" />

        <div className="bloco">
          <div><strong>Cliente:</strong> {venda.cliente_nome || "-"}</div>
          <div><strong>Telefone:</strong> {venda.cliente_telefone || "-"}</div>
          <div><strong>Data:</strong> {new Date(venda.created_at).toLocaleString("pt-BR")}</div>
          <div><strong>Pagamento:</strong> {venda.forma_pagamento || "-"}</div>
          <div><strong>Cidade:</strong> {venda.cidade || "-"}</div>
        </div>

        <div className="linha" />

        <div className="itens">
          {itens.map((item, i) => (
            <div className="item" key={i}>
              <div className="item-nome">{item.nome}</div>
              <div className="item-linha">
                <span>
                  {item.quantidade} x R$ {Number(item.preco_unitario).toFixed(2)}
                </span>
                <span>
                  R$ {(Number(item.quantidade) * Number(item.preco_unitario)).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="linha" />

        <div className="total">
          Total: R$ {Number(venda.total).toFixed(2)}
        </div>

        {venda.observacao && (
          <>
            <div className="linha" />
            <div className="obs">
              <strong>Obs:</strong> {venda.observacao}
            </div>
          </>
        )}

        <div className="linha" />

        <div className="rodape">Obrigado pela preferência</div>
      </div>
    </div>
  );
}