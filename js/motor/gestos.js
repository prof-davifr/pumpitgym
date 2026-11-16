// Pontos do corpo usados pelo rastreio e o filtro que suaviza cada ponto.
// Lógica pura (sem DOM), assim os testes rodam no Node.

export const PONTO = {
  nariz: 0,
  ombroE: 11,
  ombroD: 12,
  pulsoE: 15,
  pulsoD: 16,
  quadrilE: 23,
  quadrilD: 24,
  joelhoE: 25,
  joelhoD: 26,
};

// Filtro "One Euro": suaviza o tremor quando o ponto está parado, mas segue rápido quando ele se move.
export class FiltroUmEuro {
  constructor(minCorte = 1.5, beta = 2.0, dCorte = 1.0) {
    this.minCorte = minCorte;
    this.beta = beta;
    this.dCorte = dCorte;
    this.x = null;
    this.dx = 0;
    this.t = null;
  }
  static alfa(corte, dt) {
    const tau = 1 / (2 * Math.PI * corte);
    return 1 / (1 + tau / dt);
  }
  filtrar(x, t) {
    if (this.x === null || this.t === null || t <= this.t) {
      this.x = x;
      this.t = t;
      return x;
    }
    const dt = t - this.t;
    this.t = t;
    const dxBruto = (x - this.x) / dt;
    const ad = FiltroUmEuro.alfa(this.dCorte, dt);
    this.dx = ad * dxBruto + (1 - ad) * this.dx;
    const corte = this.minCorte + this.beta * Math.abs(this.dx);
    const a = FiltroUmEuro.alfa(corte, dt);
    this.x = a * x + (1 - a) * this.x;
    return this.x;
  }
  reiniciar() {
    this.x = null;
    this.t = null;
    this.dx = 0;
  }
}
