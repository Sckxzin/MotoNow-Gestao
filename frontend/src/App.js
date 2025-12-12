// src/App.js
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import CadastroPeca from "./pages/CadastroPeca";
import VendaPeca from "./pages/VendaPeca";
import NotaFiscal from "./pages/NotaFiscal";
import Vendas from "./pages/Vendas"; // <-- IMPORTAÇÃO CORRETA
import CadastroMoto from "./pages/CadastroMoto";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/cadastro-peca" element={<CadastroPeca />} />
        <Route path="/vender/:id" element={<VendaPeca />} />
        <Route path="/nota" element={<NotaFiscal />} />
        <Route path="/vendas" element={<Vendas />} />
        <Route path="/cadastro-moto" element={<CadastroMoto />} />
      </Routes>
    </BrowserRouter>
  );
}
