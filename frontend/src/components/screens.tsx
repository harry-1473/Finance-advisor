import { useState, type FormEvent } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Banner, Card, Stat, TonePill } from './ui'
import { askAdvisor } from '../lib/api'
import { mmk, mmkFull, pct, pretty, toneDot } from '../lib/format'
import type { Analysis, BusinessInput, Role, Screen } from '../lib/types'

function Field({
  label,
  value,
  onChange,
  step = 100000,
}: {
  label: string
  value: number
  onChange: (n: number) => void
  step?: number
}) {
  return (
    <label className="block text-sm">
      <span className="text-ink/70">{label}</span>
      <input
        type="number"
        className="mt-1 w-full rounded-lg border border-rule bg-white px-3 py-2 text-ink outline-none focus:border-leaf"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

export function InputScreen({
  business,
  setBusiness,
  onAnalyze,
  busy,
}: {
  business: BusinessInput
  setBusiness: (b: BusinessInput) => void
  onAnalyze: () => void
  busy: boolean
}) {
  const patchMonth = (i: number, key: 'sales' | 'expenses', value: number) => {
    const months = business.months.map((m, idx) => (idx === i ? { ...m, [key]: value } : m))
    setBusiness({ ...business, months })
  }
  const patchBreak = (i: number, key: keyof BusinessInput['months'][0]['breakdown'], value: number) => {
    const months = business.months.map((m, idx) =>
      idx === i ? { ...m, breakdown: { ...m.breakdown, [key]: value } } : m,
    )
    setBusiness({ ...business, months })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl">SME financial input</h2>
        <p className="mt-2 max-w-2xl text-ink/70">
          Three months of sales, expenses, cash and a loan request are enough to forecast the next quarter
          and show the same picture to the owner and the bank.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5 space-y-3">
          <h3 className="font-serif text-xl">Business</h3>
          <label className="block text-sm">
            <span className="text-ink/70">Name</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule bg-white px-3 py-2"
              value={business.name}
              onChange={(e) => setBusiness({ ...business, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink/70">Sector</span>
            <input
              className="mt-1 w-full rounded-lg border border-rule bg-white px-3 py-2"
              value={business.sector}
              onChange={(e) => setBusiness({ ...business, sector: e.target.value })}
            />
          </label>
          <Field
            label="Current cash (MMK)"
            value={business.current_cash}
            onChange={(n) => setBusiness({ ...business, current_cash: n })}
          />
          <Field
            label="Existing monthly debt service (MMK)"
            value={business.loan.existing_monthly_debt}
            onChange={(n) =>
              setBusiness({ ...business, loan: { ...business.loan, existing_monthly_debt: n } })
            }
          />
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-serif text-xl">Loan request</h3>
          <Field
            label="Amount (MMK)"
            value={business.loan.amount}
            onChange={(n) => setBusiness({ ...business, loan: { ...business.loan, amount: n } })}
          />
          <Field
            label="Annual interest (%)"
            value={business.loan.annual_rate_pct}
            step={0.5}
            onChange={(n) => setBusiness({ ...business, loan: { ...business.loan, annual_rate_pct: n } })}
          />
          <Field
            label="Term (months)"
            value={business.loan.term_months}
            step={1}
            onChange={(n) => setBusiness({ ...business, loan: { ...business.loan, term_months: n } })}
          />
          <p className="text-sm text-ink/60">
            Aman does not approve or reject. It estimates repayment capacity and a healthier range.
          </p>
        </Card>
      </div>
      {business.months.map((m, i) => (
        <Card key={m.month} className="p-5">
          <h3 className="font-serif text-xl">{m.month}</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Sales" value={m.sales} onChange={(n) => patchMonth(i, 'sales', n)} />
            <Field label="Expenses" value={m.expenses} onChange={(n) => patchMonth(i, 'expenses', n)} />
            <div className="rounded-xl border border-dashed border-rule p-3 text-sm text-ink/70">
              Profit (sales − expenses)
              <div className="font-serif text-2xl text-ink">{mmk(m.sales - m.expenses)}</div>
            </div>
            <Field label="Inventory" value={m.breakdown.inventory} onChange={(n) => patchBreak(i, 'inventory', n)} />
            <Field label="Payroll" value={m.breakdown.payroll} onChange={(n) => patchBreak(i, 'payroll', n)} />
            <Field label="Marketing" value={m.breakdown.marketing} onChange={(n) => patchBreak(i, 'marketing', n)} />
            <Field label="Operating" value={m.breakdown.operating} onChange={(n) => patchBreak(i, 'operating', n)} />
          </div>
        </Card>
      ))}
      <button
        type="button"
        onClick={onAnalyze}
        disabled={busy}
        className="rounded-full bg-moss px-6 py-3 text-sm font-semibold text-paper hover:bg-leaf disabled:opacity-60"
      >
        {busy ? 'Analyzing…' : 'Run shared analysis'}
      </button>
    </div>
  )
}

export function DashboardScreen({ analysis, role }: { analysis: Analysis; role: Role }) {
  const chart = analysis.history.map((h) => ({
    month: h.month,
    Sales: h.sales / 1e6,
    Expenses: h.expenses / 1e6,
    Profit: h.profit / 1e6,
  }))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl">{role === 'bank' ? 'SME credit intelligence' : 'My business'}</h2>
          <p className="mt-1 text-ink/65">
            {analysis.meta.name} · {analysis.meta.sector} · {analysis.meta.location}
          </p>
        </div>
        <div className="rounded-2xl border border-rule bg-paper px-5 py-3 text-right">
          <div className="text-xs uppercase tracking-[0.14em] text-moss/70">
            {role === 'bank' ? 'Financial health' : 'Business health'}
          </div>
          <div className="font-serif text-4xl text-moss">{analysis.health.score} / 100</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Revenue" value={`${mmk(analysis.latest.revenue)} MMK`} hint={analysis.latest.month} />
        <Stat label="Expenses" value={`${mmk(analysis.latest.expenses)} MMK`} />
        <Stat label="Profit" value={`${mmk(analysis.latest.profit)} MMK`} hint={`${(analysis.latest.margin * 100).toFixed(0)}% margin`} />
        <Stat label="Cash on hand" value={`${mmk(analysis.latest.cash)} MMK`} />
      </div>
      <Card className="p-5">
        <h3 className="font-serif text-xl">Shared indicators</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.indicators.map((ind) => (
            <div key={ind.key} className="flex items-center justify-between rounded-xl border border-rule px-4 py-3">
              <span className="text-sm text-ink/70">{ind.label}</span>
              <TonePill tone={ind.tone} label={ind.result} />
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="font-serif text-xl">Sales, expenses, profit</h3>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart}>
              <CartesianGrid stroke="#ddd4c4" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${v}M`} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}M MMK`} />
              <Legend />
              <Area type="monotone" dataKey="Sales" stroke="#1f4d38" fill="#1f4d38" fillOpacity={0.18} />
              <Area type="monotone" dataKey="Expenses" stroke="#b45309" fill="#c4a35a" fillOpacity={0.18} />
              <Area type="monotone" dataKey="Profit" stroke="#2f6f4e" fill="#2f6f4e" fillOpacity={0.12} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Banner kind={analysis.loan.purpose.type === 'growth' ? 'opportunity' : analysis.loan.purpose.type === 'survival' ? 'alert' : 'watch'} title={analysis.loan.purpose.label}>
        {analysis.loan.purpose.summary}
      </Banner>
      <Card className="p-5">
        <h3 className="font-serif text-xl">{role === 'bank' ? 'AI insight for the credit file' : 'AI finance advisor'}</h3>
        <p className="mt-3 leading-relaxed text-ink/80">
          {role === 'bank' ? analysis.bank_insight : analysis.sme_insight}
        </p>
        <p className="mt-3 text-xs text-ink/50">{analysis.meta.disclaimer}</p>
      </Card>
    </div>
  )
}

export function ForecastScreen({ analysis }: { analysis: Analysis }) {
  const data = analysis.forecast.months.map((month, i) => ({
    month,
    Revenue: analysis.forecast.revenue[i] / 1e6,
    Expenses: analysis.forecast.expenses[i] / 1e6,
    Cash: analysis.cash_flow.rows[i].projected_cash / 1e6,
  }))
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl">Next 3 months</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/65">{analysis.meta.forecast_method}</p>
      </div>
      <Banner
        kind={analysis.cash_flow.status === 'healthy' ? 'opportunity' : analysis.cash_flow.status === 'high_risk' ? 'alert' : 'watch'}
        title={`Cash flow status: ${toneDot(analysis.cash_flow.status)} ${pretty(analysis.cash_flow.status)}`}
      >
        {analysis.cash_flow.explanation}
      </Banner>
      {analysis.alerts.map((a) => (
        <Banner key={a.title} kind={a.type === 'alert' ? 'alert' : a.type === 'opportunity' ? 'opportunity' : 'watch'} title={a.title}>
          {a.body}
        </Banner>
      ))}
      <div className="grid gap-3 md:grid-cols-3">
        {analysis.forecast.months.map((m, i) => (
          <Stat
            key={m}
            label={m}
            value={`${analysis.cash_flow.rows[i].projected_cash >= 0 ? '+' : ''}${mmk(analysis.cash_flow.rows[i].projected_cash)}`}
            hint={`Rev ${mmk(analysis.forecast.revenue[i])} · Exp ${mmk(analysis.forecast.expenses[i])}`}
          />
        ))}
      </div>
      <Card className="overflow-x-auto p-5">
        <h3 className="font-serif text-xl">Cash-flow build</h3>
        <p className="mt-1 text-sm text-ink/60">Expected revenue − expenses − loan repayment + opening cash</p>
        <table className="mt-4 w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-moss/70">
            <tr>
              <th className="py-2">Month</th>
              <th>Opening</th>
              <th>Revenue</th>
              <th>Expenses</th>
              <th>Repayment</th>
              <th>Projected cash</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {analysis.cash_flow.rows.map((r) => (
              <tr key={r.month} className="border-t border-rule">
                <td className="py-3 font-medium">{r.month}</td>
                <td>{mmk(r.opening_cash)}</td>
                <td>{mmk(r.expected_revenue)}</td>
                <td>{mmk(r.expected_expenses)}</td>
                <td>{mmk(r.loan_repayment)}</td>
                <td className="font-semibold">{mmk(r.projected_cash)}</td>
                <td>
                  <TonePill tone={r.risk === 'healthy' ? 'green' : r.risk === 'high_risk' ? 'red' : 'amber'} label={r.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card className="p-5">
        <h3 className="font-serif text-xl">Expense vs revenue trend</h3>
        <p className="mt-2 text-sm text-ink/70">
          Last month sales {pct(analysis.growth_rates.sales_mom)}, expenses {pct(analysis.growth_rates.expenses_mom)}. {analysis.forecast.expense_note}
        </p>
        <div className="mt-4 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid stroke="#ddd4c4" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => `${v}M`} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Revenue" stroke="#1f4d38" fill="#1f4d38" fillOpacity={0.12} />
              <Area type="monotone" dataKey="Expenses" stroke="#b45309" fill="#c4a35a" fillOpacity={0.2} />
              <Area type="monotone" dataKey="Cash" stroke="#2f6f4e" fill="#2f6f4e" fillOpacity={0.08} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="space-y-3">
        {analysis.category_insights.map((c) => (
          <Banner key={c.title} kind={c.severity === 'alert' ? 'alert' : c.severity === 'opportunity' ? 'opportunity' : 'info'} title={c.title}>
            {c.detail}
          </Banner>
        ))}
      </div>
    </div>
  )
}

export function SimulatorScreen({
  analysis,
  business,
  onChangeLoan,
  busy,
}: {
  analysis: Analysis
  business: BusinessInput
  onChangeLoan: (patch: { amount?: number; annual_rate_pct?: number; term_months?: number }) => void
  busy: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl">Financing simulator</h2>
        <p className="mt-2 max-w-2xl text-ink/70">
          Change the amount, rate, or term. Aman recalculates repayment, cash after debt service, and risk — for the owner and the banker together.
        </p>
      </div>
      <Card className="p-5 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="font-serif text-2xl">{mmk(business.loan.amount)} MMK</div>
          <div className="text-sm text-ink/60">{busy ? 'Recalculating…' : 'Live with the shared model'}</div>
        </div>
        <input
          type="range"
          min={10_000_000}
          max={50_000_000}
          step={5_000_000}
          value={business.loan.amount}
          onChange={(e) => onChangeLoan({ amount: Number(e.target.value) })}
          className="w-full accent-moss"
        />
        <div className="flex justify-between text-xs text-ink/50">
          <span>10M</span>
          <span>30M</span>
          <span>50M</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Annual rate (%)"
            value={business.loan.annual_rate_pct}
            step={0.5}
            onChange={(n) => onChangeLoan({ annual_rate_pct: n })}
          />
          <Field
            label="Term (months)"
            value={business.loan.term_months}
            step={1}
            onChange={(n) => onChangeLoan({ term_months: n })}
          />
        </div>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Requested" value={`${mmk(analysis.loan.requested)} MMK`} />
        <Stat label="Estimated payment" value={`${mmk(analysis.loan.monthly_payment)} /mo`} />
        <Stat label="Cash-flow buffer" value={`${mmk(analysis.loan.cash_flow_buffer)} /mo`} />
        <Stat label="Repayment capacity" value={`${toneDot(analysis.loan.repayment_capacity)} ${pretty(analysis.loan.repayment_capacity)}`} />
      </div>
      <Banner kind="info" title="AI financing analysis">
        {analysis.loan.why}
      </Banner>
      <Banner kind={analysis.loan.purpose.color === 'green' ? 'opportunity' : analysis.loan.purpose.color === 'red' ? 'alert' : 'watch'} title={analysis.loan.purpose.label}>
        {analysis.loan.purpose.summary}
      </Banner>
      <Card className="overflow-x-auto p-5">
        <h3 className="font-serif text-xl">Amount comparison</h3>
        <p className="mt-1 text-sm text-moss">{analysis.loan.range.narrative}</p>
        <table className="mt-4 w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-moss/70">
            <tr>
              <th className="py-2">Loan</th>
              <th>Repayment</th>
              <th>Avg cash after</th>
              <th>Min cash</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {analysis.loan.range.table.map((row) => (
              <tr
                key={row.amount}
                className={`border-t border-rule ${row.amount === analysis.loan.requested ? 'bg-leaf/8' : ''}`}
              >
                <td className="py-3 font-medium">{mmk(row.amount)}</td>
                <td>{mmk(row.repayment)}</td>
                <td>{mmk(row.cash_after)}</td>
                <td>{mmk(row.min_cash)}</td>
                <td>
                  <TonePill
                    tone={row.risk === 'healthy' ? 'green' : row.risk === 'high_risk' ? 'red' : 'amber'}
                    label={row.risk}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-ink/50">{analysis.meta.disclaimer}</p>
    </div>
  )
}

const smePrompts = [
  'Do I actually need a loan?',
  'How much can I afford to borrow?',
  'How can I cover my loan repayment?',
  'When will my cash flow become tight?',
  'What expenses should I reduce?',
  'How can I improve profitability without starving growth?',
]

const bankPrompts = [
  'Is this SME financially healthy?',
  'Does the SME actually need financing?',
  'How much financing can it reasonably handle?',
  'Will future cash flow support repayment?',
  'What are the major financial risks?',
]

export function AdvisorScreen({
  analysis,
  business,
  role,
}: {
  analysis: Analysis
  business: BusinessInput
  role: Role
}) {
  const [messages, setMessages] = useState<{ role: 'user' | 'aman'; text: string }[]>([
    {
      role: 'aman',
      text:
        role === 'bank'
          ? analysis.bank_insight
          : analysis.sme_insight,
    },
  ])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const prompts = role === 'bank' ? bankPrompts : smePrompts

  async function send(text: string) {
    const question = text.trim()
    if (!question || busy) return
    setBusy(true)
    setErr(null)
    setMessages((m) => [...m, { role: 'user', text: question }])
    setQ('')
    try {
      const res = await askAdvisor(question, business, role)
      setMessages((m) => [...m, { role: 'aman', text: res.answer }])
    } catch {
      setErr('The advisor could not respond. Check that the API is running.')
    } finally {
      setBusy(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send(q)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl">{role === 'bank' ? 'Credit insight copilot' : 'AI finance advisor'}</h2>
        <p className="mt-2 max-w-2xl text-ink/70">
          Answers are grounded in this SME’s numbers — not generic tips. The same model is visible to both sides.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => void send(p)}
            className="rounded-full border border-rule bg-paper px-3 py-1.5 text-left text-sm hover:border-leaf"
          >
            {p}
          </button>
        ))}
      </div>
      <Card className="flex min-h-[420px] flex-col p-4">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user' ? 'ml-auto bg-moss text-paper' : 'bg-sand text-ink'
              }`}
            >
              {m.text}
            </div>
          ))}
          {busy ? <div className="text-sm text-ink/50">Aman is reading the ledger…</div> : null}
          {err ? <div className="text-sm text-red-700">{err}</div> : null}
        </div>
        <form onSubmit={onSubmit} className="mt-4 flex gap-2">
          <input
            className="flex-1 rounded-full border border-rule bg-white px-4 py-2 outline-none focus:border-leaf"
            placeholder={role === 'bank' ? 'Ask about repayment capacity…' : 'Ask how to cover repayment…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-paper">
            Send
          </button>
        </form>
      </Card>
    </div>
  )
}

export function BankPack({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl">Bank view — decision support</h2>
        <p className="mt-2 text-ink/70">Same data as the SME. Different questions. Not an automated approval engine.</p>
      </div>
      <Card className="p-6">
        <h3 className="text-xs uppercase tracking-[0.16em] text-moss/70">SME financial profile</h3>
        <div className="mt-2 font-serif text-4xl">{analysis.health.score} / 100</div>
        <div className="mt-6 space-y-3">
          {analysis.indicators.map((ind) => (
            <div key={ind.key} className="flex items-center justify-between border-b border-rule pb-2">
              <span>{ind.label}</span>
              <span>
                {toneDot(ind.tone)} {pretty(ind.result)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-[0.16em] text-moss/70">Financing analysis</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>Requested: {mmkFull(analysis.loan.requested)}</div>
            <div>
              Suggested range: {mmk(analysis.loan.range.min)}–{mmk(analysis.loan.range.max)}
            </div>
            <div>
              Repayment capacity: {toneDot(analysis.loan.repayment_capacity)} {pretty(analysis.loan.repayment_capacity)}
            </div>
            <div>Need for funds: {analysis.need_financing.answer}</div>
          </dl>
        </div>
        <div className="mt-8 rounded-xl bg-sand p-4">
          <h3 className="text-xs uppercase tracking-[0.16em] text-moss/70">AI insight</h3>
          <p className="mt-2 leading-relaxed">{analysis.bank_insight}</p>
        </div>
      </Card>
    </div>
  )
}

export function Nav({
  screen,
  setScreen,
  role,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
  role: Role
}) {
  const items: { id: Screen; label: string }[] =
    role === 'bank'
      ? [
          { id: 'bank', label: 'Credit file' },
          { id: 'dashboard', label: 'Shared dashboard' },
          { id: 'forecast', label: 'Forecast' },
          { id: 'simulator', label: 'Simulator' },
          { id: 'advisor', label: 'Credit copilot' },
          { id: 'input', label: 'Source data' },
        ]
      : [
          { id: 'dashboard', label: 'My business' },
          { id: 'forecast', label: 'Forecast' },
          { id: 'simulator', label: 'Simulator' },
          { id: 'advisor', label: 'Advisor' },
          { id: 'input', label: 'Update numbers' },
        ]
  return (
    <nav className="flex gap-1 overflow-x-auto pb-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setScreen(item.id)}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
            screen === item.id ? 'bg-moss text-paper' : 'text-ink/70 hover:bg-paper'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
