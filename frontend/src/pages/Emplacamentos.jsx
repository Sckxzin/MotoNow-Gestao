import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Emplacamentos.css";

export default function Emplacamentos() {
  const nav = useNavigate();

  const [user, setUser] = useState(null);
  const [lista, setLista] = useState([]);
  const [modal, setModal] = useState(false);

  const [cliente, setCliente] = useState("");
  const [moto, setMoto] = useState("");
  const [cidade, setCidade] = useState("");
  const [data, setData] = useState("");
  const [valor, setValor] = useState("");
  const [custo, setCusto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return nav("/");

    const dataUser = JSON.parse(raw);

    if (dataUser.role !== "DIRETORIA") {
      alert("Acesso restrito à Diretoria");
      return nav("/home");
    }

    setUser(dataUser);
    carregar();
  }, [nav]);

  async function carregar() {
    const res = await api.get("/emplacamentos", {
      params: { role: "DIRETORIA" },
    });
    setLista(res.data || []);
  }

  async function salvar() {
    if (!cliente || !moto || !cidade || !data || valor === "" || custo === "") {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    await api.post(`/emplacamentos?role=DIRETORIA`, {
      cliente,
      moto,
      cidade,
      data,
      valor: Number(valor),
      custo: Number(custo),
      forma_pagamento: formaPagamento || null,
    });

    setModal(false);
    setCliente("");
    setMoto("");
    setCidade("");
    setData("");
    setValor("");
    setCusto("");
    setFormaPagamento("");

    carregar();
  }

  if (!user) return null;

  return (
    <div className="emplac-container">
      <div className="emplac-header">
        <h2>🪪 Emplacamentos</h2>
        <div>
          <button onClick={() => setModal(true)}>➕ Novo</button>
          <button onClick={() => nav("/home")}>⬅ Voltar</button>
        </div>
      </div>

      <table className="emplac-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Moto</th>
            <th>Cidade</th>
            <th>Data</th>
            <th>Valor</th>
            <th>Custo</th>
            <th>Loja (Lucro)</th>
            <th>Forma</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((e) => {
            const lucro =
              Number(e.valor || 0) - Number(e.custo || 0);

            return (
              <tr key={e.id}>
                <td>{e.cliente}</td>
                <td>{e.moto}</td>
                <td>{e.cidade}</td>
                <td>
                  {e.data
                    ? new Date(e.data).toLocaleDateString("pt-BR")
                    : "-"}
                </td>
                <td>R$ {Number(e.valor).toFixed(2)}</td>
                <td>R$ {Number(e.custo).toFixed(2)}</td>
                <td className="lucro">
                  R$ {lucro.toFixed(2)}
                </td>
                <td>{e.forma_pagamento || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {modal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Novo Emplacamento</h3>

            <input placeholder="Cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
            <input placeholder="Moto" value={moto} onChange={(e) => setMoto(e.target.value)} />
            <input placeholder="Cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            <input type="number" placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} />
            <input type="number" placeholder="Custo" value={custo} onChange={(e) => setCusto(e.target.value)} />

            <div className="preview-lucro">
              Loja (lucro): R$ {(Number(valor || 0) - Number(custo || 0)).toFixed(2)}
            </div>

            <input
              placeholder="Forma de pagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={salvar}>Salvar</button>
              <button onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}