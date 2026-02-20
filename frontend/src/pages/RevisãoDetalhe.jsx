import { useEffect, useState } from "react";
import api from "../api";
import { useParams } from "react-router-dom";

export default function RevisaoDetalhe() {
  const { id } = useParams();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    api.get(`/revisoes/${id}`)
      .then(res => setDados(res.data))
      .catch(() => alert("Erro ao carregar revisão"));
  }, [id]);

  if (!dados) return <p>Carregando...</p>;

  const { revisao, itens } = dados;

  return (
    <div>
      <h2>Ordem de Serviço #{revisao.id}</h2>

      <p><strong>Cliente:</strong> {revisao.cliente_nome}</p>
      <p><strong>Moto:</strong> {revisao.modelo_moto}</p>
      <p><strong>KM:</strong> {revisao.km}</p>
      <p><strong>Tipo:</strong> {revisao.tipo_revisao}</p>
      <p><strong>Status:</strong> {revisao.status}</p>

      <h3>Peças Utilizadas</h3>
      <ul>
        {itens.map((i, index) => (
          <li key={index}>
            {i.nome_peca} - {i.quantidade}x - R$ {Number(i.preco_unitario).toFixed(2)}
          </li>
        ))}
      </ul>

      <h3>Total: R$ {Number(revisao.total).toFixed(2)}</h3>
    </div>
  );
}
