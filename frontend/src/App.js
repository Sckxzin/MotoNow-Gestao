// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import CadastroPeca from "./pages/CadastroPeca";
import VendaPeca from "./pages/VendaPeca";
import NotaFiscal from "./pages/NotaFiscal";
import Vendas from "./pages/Vendas";
import CadastroMoto from "./pages/CadastroMoto";
import VenderMoto from "./pages/VenderMoto";
// ❌ REMOVIDO — Revisão não existe mais
// import Revisao from "./pages/Revisao";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />

        {/* Peças */}
        <Route path="/cadastro-peca" element={<CadastroPeca />} />
        <Route path="/vender/:id" element={<VendaPeca />} />
        <Route path="/nota" element={<NotaFiscal />} />

        {/* Vendas */}
        <Route path="/vendas" element={<Vendas />} />

        {/* Motos */}
        <Route path="/cadastro-moto" element={<CadastroMoto />} />
        <Route path="/vender-moto/:id" element={<VenderMoto />} />

        {/* ❌ Removido: Revisão */}
        {/* <Route path="/revisao" element={<Revisao />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
