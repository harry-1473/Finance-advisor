export function mmk(n: number, digits = 1) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n < 0 ? '−' : ''}${(abs / 1_000_000).toFixed(digits)}M`
  if (abs >= 1_000) return `${n < 0 ? '−' : ''}${(abs / 1_000).toFixed(0)}K`
  return new Intl.NumberFormat('en-US').format(Math.round(n))
}

export function mmkFull(n: number) {
  return `${new Intl.NumberFormat('en-US').format(Math.round(n))} MMK`
}

export function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(0)}%`
}

export function pretty(s: string) {
  return s.replaceAll('_', ' ')
}

export function toneDot(tone: string) {
  if (tone === 'green' || tone === 'healthy' || tone === 'strong' || tone === 'low' || tone === 'growth')
    return '🟢'
  if (tone === 'red' || tone === 'high_risk' || tone === 'weak' || tone === 'high' || tone === 'survival')
    return '🔴'
  return '🟡'
}
