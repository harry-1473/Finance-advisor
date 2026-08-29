import type { Analysis, BusinessInput } from './types'

export async function fetchDemo(): Promise<{ business: BusinessInput; analysis: Analysis }> {
  const res = await fetch('/api/demo')
  if (!res.ok) throw new Error('Could not load demo company')
  return res.json()
}

export async function analyzeBusiness(business: BusinessInput): Promise<Analysis> {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(business),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
}

export async function simulateLoan(
  business: BusinessInput,
  patch: { amount?: number; annual_rate_pct?: number; term_months?: number },
): Promise<Analysis> {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ business, ...patch }),
  })
  if (!res.ok) throw new Error('Simulation failed')
  return res.json()
}

export async function askAdvisor(
  question: string,
  business: BusinessInput,
  role: 'sme' | 'bank',
): Promise<{ answer: string; source: string }> {
  const res = await fetch('/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, business, role }),
  })
  if (!res.ok) throw new Error('Advisor unavailable')
  return res.json()
}
