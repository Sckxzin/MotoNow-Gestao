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
  <div className="nota-topo">
    <h2>MotoNow</h2>
    <p>Comprovante de Venda</p>
  </div>

  <div className="linha" />

  <div className="info">
    <p><strong>Cliente:</strong> {venda.cliente_nome}</p>
    <p><strong>Telefone:</strong> {venda.cliente_telefone || "-"}</p>
    <p><strong>Data:</strong> {new Date(venda.created_at).toLocaleString("pt-BR")}</p>
    <p><strong>Pagamento:</strong> {venda.forma_pagamento}</p>
    <p><strong>Cidade:</strong> {venda.cidade}</p>
  </div>

  <div className="linha" />

  {itens.map((item, i) => (
    <div className="item" key={i}>
      <div className="item-nome">{item.nome}</div>
      <div className="item-detalhe">
        <span className="item-qtd">
          {item.quantidade} x {Number(item.preco_unitario).toFixed(2)}
        </span>
        <span className="item-preco">
          R$ {(Number(item.quantidade) * Number(item.preco_unitario)).toFixed(2)}
        </span>
      </div>
    </div>
  ))}

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

  <div className="rodape">
    Obrigado pela preferência
  </div>
</div>