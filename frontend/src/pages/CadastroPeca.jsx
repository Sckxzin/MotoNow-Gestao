import { useState } from "react";
import "./CadastrarPeca.css";

export default function CadastrarPeca() {
  const [form, setForm] = useState({
    nome: "",
    preco: "",
    estoque: "",
    cidade: "",
    aplicacao: "",
    tipo_moto: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Não autenticado");
      return;
    }

    const res = await fetch("http://localhost:3333/cadastrar-peca", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        ...form,
        preco: Number(form.preco),
        estoque: Number(form.estoque)
      })
    });

    const json = await res.json();
    alert(json.message);

    if (res.ok) {
      setForm({
        nome: "",
        preco: "",
        estoque: "",
        cidade: "",
        aplicacao: "",
        tipo_moto: ""
      });
    }
  };

  return (
    <div className="cadastrar-peca">
      <h2>Cadastrar Peça (Diretoria)</h2>

      <form onSubmit={handleSubmit}>
        <input name="nome" placeholder="Nome" value={form.nome} onChange={handleChange} required />
        <input name="preco" type="number" step="0.01" placeholder="Preço" value={form.preco} onChange={handleChange} required />
        <input name="estoque" type="number" placeholder="Estoque" value={form.estoque} onChange={handleChange} required />
        <input name="cidade" placeholder="Cidade" value={form.cidade} onChange={handleChange} required />
        <input name="aplicacao" placeholder="Aplicação (opcional)" value={form.aplicacao} onChange={handleChange} />
        <input name="tipo_moto" placeholder="Tipo de moto (opcional)" value={form.tipo_moto} onChange={handleChange} />

        <button type="submit">Cadastrar</button>
      </form>
    </div>
  );
}
