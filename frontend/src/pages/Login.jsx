import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

export default function Login() {
  const nav = useNavigate();
  const [username, setUser] = useState("");
  const [password, setPass] = useState("");

  async function handleLogin() {
    try {

      // 🔥 IP FIXO PARA FUNCIONAR NO CELULAR E EM QUALQUER PC DA REDE
      const API = "http://192.168.1.24:5000/login";

      const res = await axios.post(API, {
        username,
        password
      });

      localStorage.setItem("user", JSON.stringify(res.data));

      nav("/home");

    } catch (err) {
      console.log("ERRO LOGIN:", err);
      alert("Usuário ou senha inválidos!");
    }
  }

  return (
    <div className="login-container">

      <div className="login-card">
        <img src="/logo-shineray.png" alt="Shineray" className="login-logo" />

        <h2 className="login-title">MotoNow - Gestão</h2>

        <input
          type="text"
          placeholder="Usuário"
          className="login-input"
          value={username}
          onChange={(e) => setUser(e.target.value)}
        />

        <input
          type="password"
          placeholder="Senha"
          className="login-input"
          value={password}
          onChange={(e) => setPass(e.target.value)}
        />

        <button className="login-btn" onClick={handleLogin}>
          Entrar
        </button>
      </div>

    </div>
  );
}
