import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function CadastroPeca() {
  const nav = useNavigate();

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState(0);
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [modeloMoto, setModeloMoto] = useState("");
  const [filialEscolhida, setFilialEscolhida] = useState("");

  const user = JSON.parse(localStorage.getItem("user"));

  const modelosDisponiveis = ["Jet", "Phoenix", "Shi", "JEF"];

  const filiais = [
    "Escada",
    "Matriz",
    "Ipojuca",
    "Ribeirão",
    "Catende",
    "Xexeu",
    "São Jose"
  ];

  async function salvar() {
    if (!nome || !codigo || quantidade <= 0 || valor <= 0) {
      return alert("Preencha nome, código, quantidade e valor!");
    }

    if (user.role === "Diretoria" && !filialEscolhida) {
      return alert("Selecione a filial!");
    }

    const filialFinal =
      user.role === "Diretoria" ? filialEscolhida : user.filial;

    try {
      await api.post("/pecas", {
        nome,
        codigo,
        quantidade,
        valor: Number(valor),
        filial_atual: filialFinal
      });

      alert("Peça cadastrada com sucesso!");
      nav("/home");
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar peça!");
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Cadastro de Peça</h2>

      <input
        placeholder="Nome da peça"
        onChange={(e) => setNome(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Código"
        onChange={(e) => setCodigo(e.target.value)}
      />
      <br /><br />

      <input
        type="number"
        placeholder="Quantidade"
        onChange={(e) => setQuantidade(Number(e.target.value))}
      />
      <br /><br />

      <input
        type="number"
        placeholder="Valor (R$)"
        step="0.01"
        onChange={(e) => setValor(e.target.value)}
      />
      <br /><br />

      <label><b>Categoria:</b></label><br />
      <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        <option value="">Selecione...</option>
        <option value="Óleo">Óleo</option>
        <option value="Capacete">Capacete</option>
        <option value="Acessório">Acessório</option>
        <option value="Motor">Motor</option>
        <option value="Elétrica">Elétrica</option>
        <option value="Moto">Peça de Moto</option>
      </select>

      <br /><br />

      {categoria === "Moto" && (
        <>
          <label><b>Modelo da Moto:</b></label><br />
          <select
            value={modeloMoto}
            onChange={(e) => setModeloMoto(e.target.value)}
          >
            <option value="">Selecione...</option>
            {modelosDisponiveis.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <br /><br />
        </>
      )}

      {user.role === "Diretoria" && (
        <>
          <label><b>Filial:</b></label><br />
          <select
            value={filialEscolhida}
            onChange={(e) => setFilialEscolhida(e.target.value)}
          >
            <option value="">Selecione...</option>
            {filiais.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <br /><br />
        </>
      )}

      <button onClick={salvar} style={{ padding: 10 }}>
        Salvar
      </button>
    </div>
  );
}
