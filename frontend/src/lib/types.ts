export type Role = 'sme' | 'bank'
export type Tone = 'green' | 'amber' | 'red'
export type Screen = 'input' | 'dashboard' | 'forecast' | 'simulator' | 'advisor' | 'bank'

export type ExpenseBreakdown = {
  inventory: number
  payroll: number
  marketing: number
  operating: number
}

export type MonthlyRecord = {
  month: string
  sales: number
  expenses: number
  breakdown: ExpenseBreakdown
}

export type ProductLine = {
  name: string
  monthly_sales: number[]
  margin_pct: number
}

export type LoanRequest = {
  amount: number
  annual_rate_pct: number
  term_months: number
  existing_monthly_debt: number
}

export type BusinessInput = {
  name: string
  sector: string
  location: string
  currency: string
  current_cash: number
  months: MonthlyRecord[]
  products: ProductLine[]
  loan: LoanRequest
}

export type Analysis = {
  meta: {
    name: string
    sector: string
    location: string
    currency: string
    forecast_method: string
    disclaimer: string
  }
  latest: {
    month: string
    revenue: number
    expenses: number
    profit: number
    margin: number
    cash: number
  }
  history: Array<{
    month: string
    sales: number
    expenses: number
    profit: number
    margin: number
    breakdown: ExpenseBreakdown
  }>
  health: { score: number; label: string }
  indicators: Array<{ key: string; label: string; result: string; tone: Tone }>
  forecast: {
    months: string[]
    revenue: number[]
    expenses: number[]
    profit: number[]
    expense_note: string
  }
  cash_flow: {
    status: string
    rows: Array<{
      month: string
      opening_cash: number
      expected_revenue: number
      expected_expenses: number
      loan_repayment: number
      projected_cash: number
      buffer: number
      risk: string
    }>
    explanation: string
  }
  loan: {
    requested: number
    annual_rate_pct: number
    term_months: number
    monthly_payment: number
    existing_monthly_debt: number
    projected_cash_avg: number
    cash_flow_buffer: number
    repayment_capacity: string
    risk: string
    purpose: { type: string; label: string; color: string; summary: string }
    range: {
      min: number
      max: number
      table: Array<{
        amount: number
        repayment: number
        cash_after: number
        min_cash: number
        risk: string
      }>
      narrative: string
    }
    why: string
  }
  alerts: Array<{ type: string; title: string; body: string }>
  category_insights: Array<{
    severity: string
    category: string
    title: string
    detail: string
  }>
  product: { name: string; margin_pct: number; sales_growth: number; message: string } | null
  bank_insight: string
  sme_insight: string
  need_financing: { needed: boolean; urgency: string; answer: string }
  growth_rates: {
    sales_3m: number
    expenses_3m: number
    sales_mom: number
    expenses_mom: number
  }
}
