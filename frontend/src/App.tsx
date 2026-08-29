import { useCallback, useEffect, useState } from 'react'
import { AdvisorScreen, BankPack, DashboardScreen, ForecastScreen, InputScreen, Nav, SimulatorScreen } from './components/screens'
import { analyzeBusiness, fetchDemo, simulateLoan } from './lib/api'
import type { Analysis, BusinessInput, Role, Screen } from './lib/types'

export default function App() {
  const [role, setRole] = useState<Role>('sme')
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [business, setBusiness] = useState<BusinessInput | null>(null)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchDemo()
      .then((data) => {
        if (cancelled) return
        setBusiness(data.business)
        setAnalysis(data.analysis)
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError('Could not reach the Aman API. Start the FastAPI server on port 8766.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setScreen(role === 'bank' ? 'bank' : 'dashboard')
  }, [role])

  const runAnalyze = useCallback(async () => {
    if (!business) return
    setBusy(true)
    setError(null)
    try {
      const result = await analyzeBusiness(business)
      setAnalysis(result)
      setScreen(role === 'bank' ? 'bank' : 'dashboard')
    } catch {
      setError('Analysis failed. Confirm the API is running.')
    } finally {
      setBusy(false)
    }
  }, [business, role])

  const onChangeLoan = useCallback(
    async (patch: { amount?: number; annual_rate_pct?: number; term_months?: number }) => {
      if (!business) return
      const next = {
        ...business,
        loan: { ...business.loan, ...patch },
      }
      setBusiness(next)
      setBusy(true)
      try {
        const result = await simulateLoan(next, patch)
        setAnalysis(result)
      } catch {
        setError('Simulator could not recalculate.')
      } finally {
        setBusy(false)
      }
    },
    [business],
  )

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 md:px-8">
      <header className="flex flex-col gap-4 border-b border-rule pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Aman Copilot</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl">Predict cash flow. Recommend financing.</h1>
          <p className="mt-2 max-w-xl text-sm text-ink/65">
            One ledger, two desks. SME owners get an advisor; banks get credit insight. From loan sizing to sustainable growth.
          </p>
        </div>
        <div className="flex rounded-full border border-rule bg-paper p-1">
          {(['sme', 'bank'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                role === r ? 'bg-moss text-paper' : 'text-ink/70'
              }`}
            >
              {r === 'sme' ? 'SME owner' : 'Bank analyst'}
            </button>
          ))}
        </div>
      </header>

      {business && analysis ? <div className="mt-5"><Nav screen={screen} setScreen={setScreen} role={role} /></div> : null}

      <main className="py-8">
        {loading ? (
          <div className="rounded-2xl border border-rule bg-paper p-8 text-ink/60">Loading Golden Grain Trading…</div>
        ) : error && !analysis ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-900">{error}</div>
        ) : business && analysis ? (
          <>
            {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div> : null}
            {screen === 'input' ? (
              <InputScreen business={business} setBusiness={setBusiness} onAnalyze={runAnalyze} busy={busy} />
            ) : null}
            {screen === 'dashboard' ? <DashboardScreen analysis={analysis} role={role} /> : null}
            {screen === 'forecast' ? <ForecastScreen analysis={analysis} /> : null}
            {screen === 'simulator' ? (
              <SimulatorScreen analysis={analysis} business={business} onChangeLoan={onChangeLoan} busy={busy} />
            ) : null}
      {screen === 'advisor' ? <AdvisorScreen key={role} analysis={analysis} business={business} role={role} /> : null}
            {screen === 'bank' ? <BankPack analysis={analysis} /> : null}
          </>
        ) : (
          <div className="rounded-2xl border border-rule bg-paper p-8">No financial data yet. Load the demo company from the API.</div>
        )}
      </main>

      <footer className="border-t border-rule py-6 text-xs text-ink/50">
        Decision support only. Forecasts use a linear trend on three months of history — labeled as a pattern forecast, not a high-accuracy model.
      </footer>
    </div>
  )
}
