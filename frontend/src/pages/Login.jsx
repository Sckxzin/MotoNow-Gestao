import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!username || !password) {
      alert("Preencha usuário e senha");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/login", {
        username,
        password
      });

      // 🔒 Validação de segurança da resposta
      if (!res.data || !res.data.role || !res.data.filial) {
        throw new Error("Resposta inválida da API");
      }

      // 🔥 Salvar usuário logado
      localStorage.setItem("user", JSON.stringify(res.data));

      // 🔥 Ir para o Home
      nav("/home");
    } catch (err) {
      console.error("Erro no login:", err);
      alert("Usuário ou senha inválidos, ou erro no servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <img
          src="/logo-shineray.png"
          alt="Shineray"
          className="login-logo"
        />

        <h2 className="login-title">MotoNow • Gestão</h2>

        <input
          type="text"
          placeholder="Usuário"
          className="login-input"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="login-input"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
