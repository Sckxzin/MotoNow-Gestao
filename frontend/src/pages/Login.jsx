import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./Login.css";

export default function Login() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!username || !password) {
      setError("Informe usuário e senha");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/login", {
        username,
        password,
      });

      if (!res.data || !res.data.role || !res.data.cidade) {
        throw new Error("Resposta inválida da API");
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...res.data,
          filial: res.data.cidade,
        })
      );

      nav("/home");
    } catch (err) {
      setError("Usuário ou senha inválidos");
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

        <h2 className="login-title">MotoNow</h2>
        <p className="login-subtitle">Sistema de Gestão</p>

        {error && <span className="login-error">{error}</span>}

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
          className={`login-btn ${loading ? "loading" : ""}`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : "Entrar"}
        </button>

        <footer className="login-footer">
          © MotoNow • Uso interno
        </footer>
      </div>
    </div>
  );
}
