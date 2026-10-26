import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import "./VendasMotos.css";

export default function VendasMotosPendentes() {
  const nav = useNavigate();
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(false);

  function formatarValor(valor) {
    if (valor == null || valor === "" || Number.isNaN(Number(valor))) return "-";
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  async function carregarPendentes() {
    try {
      setLoading(true);
      const res = await api.get("/vendas-motos-pendentes");
      setPendentes(res.data || []);
    } catch (e) {
      alert("Erro ao carregar pendências");
      setPendentes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarPendentes();
  }, []);

  async function enviarTermo(id, file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      alert("Selecione uma imagem JPG, PNG ou WEBP de até 5 MB.");
      return;
    }
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
        reader.readAsDataURL(file);
      });
      await api.post(`/vendas-motos-pendentes/${id}/termo-garantia`, {
        termo_garantia_base64: base64,
        termo_garantia_mime: file.type,
        termo_garantia_nome: file.name
      });
      alert("Termo de garantia anexado.");
      await carregarPendentes();
    } catch (e) {
      alert(e?.response?.data?.message || "Erro ao anexar o termo.");
    }
  }

  async function aprovar(id) {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;

    if (!window.confirm("Aprovar essa venda?")) return;

    try {
      await api.post(`/vendas-motos-pendentes/${id}/aprovar`, {
        aprovado_por: user?.username || user?.nome || "DIRETORIA"
      });
      alert("✅ Venda aprovada!");
      carregarPendentes();
    } catch (e) {
      alert(e?.response?.data?.message || "Erro ao aprovar");
    }
  }

  async function recusar(id) {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;

    const motivo = prompt("Motivo da recusa:");
    if (motivo === null) return; // cancelou

    try {
      await api.post(`/vendas-motos-pendentes/${id}/recusar`, {
        motivo_recusa: motivo || null,
        aprovado_por: user?.username || user?.nome || "DIRETORIA"
      });
      alert("❌ Venda recusada!");
      carregarPendentes();
    } catch (e) {
      alert(e?.response?.data?.message || "Erro ao recusar");
    }
  }

  return (
    <div className="vendas-motos-container">
      <div className="vm-topbar">
        <div>
          <h2 className="vm-title">🕒 Pendências de Venda (Diretoria)</h2>
          <p className="vm-subtitle">Aprovar ou recusar antes de ir para o histórico.</p>
        </div>

        <div className="vm-topbar-actions">
          <button className="vm-btn vm-btn-ghost" onClick={() => nav("/home")}>
            ⬅ Voltar
          </button>
          <button className="vm-btn vm-btn-soft" onClick={carregarPendentes}>
            🔄 Recarregar
          </button>
        </div>
      </div>

      <div className="vm-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>Total pendências:</strong> {pendentes.length}
          {loading && <span>Carregando...</span>}
        </div>
      </div>

      <div className="table-container vm-table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Moto</th>
              <th>Chassi</th>
              <th>Filial Origem</th>
              <th>Filial Venda</th>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Valor</th>
              <th>Pagamento</th>
              <th>Brinde</th>
              <th>Gasolina</th>
              <th>Data</th>
              <th>Termo de garantia</th>
              <th>Ação</th>
            </tr>
          </thead>

          <tbody>
            {pendentes.length === 0 ? (
              <tr>
                <td colSpan={13} style={{ textAlign: "center", padding: 20 }}>
                  Nenhuma pendência no momento.
                </td>
              </tr>
            ) : (
              pendentes.map(p => (
                <tr key={p.id}>
                  <td>{p.modelo}</td>
                  <td>{p.chassi}</td>
                  <td>{p.filial_origem}</td>
                  <td>{p.filial_venda}</td>
                  <td>{p.nome_cliente}</td>
                  <td>{p.telefone || p.numero_cliente || "-"}</td>
                  <td>{formatarValor(p.valor)}</td>
                  <td>{p.forma_pagamento || "-"}</td>
                  <td>{p.brinde ? "SIM" : "NÃO"}</td>
                  <td>{p.gasolina ? formatarValor(p.gasolina) : "-"}</td>
                  <td>{new Date(p.created_at).toLocaleString("pt-BR")}</td>
                  <td>
                    {p.termo_garantia_anexado ? (
                      <span style={{ color: "#15803d", fontWeight: 700 }}>✅ Anexado</span>
                    ) : (
                      <div>
                        <strong style={{ color: "#b91c1c", display: "block" }}>⚠️ Faltando</strong>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          aria-label="Anexar termo de garantia"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            enviarTermo(p.id, file);
                          }}
                        />
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className="vm-btn vm-btn-primary" onClick={() => aprovar(p.id)}>
                        ✅ Aprovar
                      </button>
                      <button className="vm-btn vm-btn-ghost" onClick={() => recusar(p.id)}>
                        ❌ Recusar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
