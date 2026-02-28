/* DashboardAuto.css */
/* IMPORTANTÍSSIMO:
   NÃO pode ter body / html / * / button / input / select sem prefixo .dash-auto
   Este arquivo é totalmente escopado para NÃO quebrar o resto do site.
*/

.dash-auto {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
}

/* tudo dentro do dashboard */
.dash-auto * {
  box-sizing: border-box;
}

/* Topbar */
.dash-auto .dash-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.dash-auto .dash-title small {
  display: inline-block;
  margin-top: 4px;
}

/* Actions */
.dash-auto .dash-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Filtros */
.dash-auto .dash-filtros {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* Quick buttons */
.dash-auto .dash-quick {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Dots */
.dash-auto .dash-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dash-auto .dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.10);
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border 120ms ease;
}

.dash-auto .dot:hover {
  transform: scale(1.1);
  background: rgba(255,255,255,0.16);
}

.dash-auto .dot.active {
  background: rgba(255,255,255,0.85);
  border-color: rgba(255,255,255,0.35);
}

/* Slide area */
.dash-auto .dash-slide {
  width: 100%;
}

/* KPI grid */
.dash-auto .grid-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  height: 100%;
}

/* layout para telas menores */
@media (max-width: 1200px) {
  .dash-auto .grid-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Hint footer */
.dash-auto .dash-hint b {
  font-weight: 700;
}

/* ======= CONTROLES (SEM VAZAR) ======= */
.dash-auto button {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 120ms ease, border 120ms ease, transform 120ms ease;
}

.dash-auto button:hover {
  background: rgba(255,255,255,0.10);
  border-color: rgba(255,255,255,0.18);
}

.dash-auto button:active {
  transform: translateY(1px);
}

.dash-auto select,
.dash-auto input[type="date"] {
  appearance: none;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.92);
  border-radius: 12px;
  padding: 10px 12px;
  outline: none;
}

.dash-auto select:focus,
.dash-auto input[type="date"]:focus {
  border-color: rgba(140,180,255,0.45);
  box-shadow: 0 0 0 3px rgba(120,160,255,0.12);
}

/* Ajuste do calendário (Chrome/Edge) */
.dash-auto input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0.75;
  filter: invert(1);
  cursor: pointer;
}

/* ======= “Empresa grande”: tipografia + espaçamento ======= */
.dash-auto h2 {
  line-height: 1.1;
}

.dash-auto .panel-title {
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

/* ======= RECHARTS: tirar “grade pesada” e deixar suave =======
   (você já colocou gridSoft no JSX, aqui só reforça visual geral)
*/
.dash-auto .recharts-tooltip-wrapper {
  outline: none;
}

/* ======= opcional: esconder scroll se algum navegador tentar ======= */
.dash-auto::-webkit-scrollbar {
  width: 0px;
  height: 0px;
}