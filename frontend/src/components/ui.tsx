import type { ReactNode } from 'react'
import { toneDot, pretty } from '../lib/format'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-rule bg-paper/90 shadow-[0_1px_0_rgba(20,36,28,0.04)] ${className}`}>
      {children}
    </section>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-rule bg-sand/60 p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-moss/70">{label}</div>
      <div className="mt-1 font-serif text-2xl text-ink">{value}</div>
      {hint ? <div className="mt-1 text-sm text-ink/60">{hint}</div> : null}
    </div>
  )
}

export function TonePill({ tone, label }: { tone: string; label: string }) {
  const color =
    tone === 'green'
      ? 'bg-leaf/10 text-moss border-leaf/20'
      : tone === 'red'
        ? 'bg-red-50 text-red-800 border-red-200'
        : 'bg-amber-50 text-amber-900 border-amber-200'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      <span>{toneDot(tone)}</span>
      {pretty(label)}
    </span>
  )
}

export function Banner({
  kind,
  title,
  children,
}: {
  kind: 'alert' | 'watch' | 'opportunity' | 'info'
  title: string
  children: ReactNode
}) {
  const styles = {
    alert: 'border-red-200 bg-red-50/80',
    watch: 'border-amber-200 bg-amber-50/80',
    opportunity: 'border-leaf/25 bg-leaf/8',
    info: 'border-rule bg-sand/70',
  }
  const mark = { alert: '⚠️', watch: '🟡', opportunity: '💡', info: 'ℹ️' }
  return (
    <div className={`rounded-xl border px-4 py-3 ${styles[kind]}`}>
      <div className="text-sm font-semibold text-ink">
        {mark[kind]} {title}
      </div>
      <div className="mt-1 text-sm leading-relaxed text-ink/75">{children}</div>
    </div>
  )
}
