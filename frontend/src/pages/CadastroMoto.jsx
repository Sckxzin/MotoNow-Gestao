import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api"; // 🔥 usa sua API com URL do Railway

export default function CadastroMoto() {
  const nav = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [cor, setCor] = useState("");
  const [chassi, setChassi] = useState("");

  // Diretoria escolhe a filial — outros já vêm com a filial automática
  const [filial, setFilial] = useState(
    user.role === "Diretoria" ? "" : user.filial
  );

  async function cadastrarMoto() {
    if (!modelo || !ano || !cor || !chassi || !filial) {
      alert("Preencha todos os campos!");
      return;
    }

    try {
      await api.post("/motos", {
        modelo,
        ano,
        cor,
        chassi,
        filial
      });

      alert("Moto cadastrada com sucesso!");
      nav("/home");
    } catch (error) {
      console.error(error);
      alert("Erro ao cadastrar moto!");
    }
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Cadastro de Moto</h2>

      <input
        placeholder="Modelo"
        value={modelo}
        onChange={(e) => setModelo(e.target.value)}
      /><br /><br />

      <input
        type="number"
        placeholder="Ano"
        value={ano}
        onChange={(e) => setAno(e.target.value)}
      /><br /><br />

      <input
        placeholder="Cor"
        value={cor}
        onChange={(e) => setCor(e.target.value)}
      /><br /><br />

      <input
        placeholder="Chassi"
        value={chassi}
        onChange={(e) => setChassi(e.target.value)}
      /><br /><br />

      {/* Diretoria pode escolher filial */}
      {user.role === "Diretoria" ? (
        <>
          <label>Filial:</label><br />
          <select
            value={filial}
            onChange={(e) => setFilial(e.target.value)}
          >
            <option value="">Selecione</option>
            <option value="Ipojuca">Ipojuca</option>
            <option value="Escada">Escada</option>
            <option value="Ribeirão">Ribeirão</option>
            <option value="Catende">Catende</option>
            <option value="Xexéu">Xexéu</option>
            <option value="São José">São José</option>
          </select>
          <br /><br />
        </>
      ) : (
        <p><b>Filial:</b> {user.filial}</p>
      )}

      <button
        style={{ padding: 10, marginTop: 10 }}
        onClick={cadastrarMoto}
      >
        Cadastrar Moto
      </button>
    </div>
  );
}
