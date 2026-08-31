export default function ProgressBar({
  percentage,
  size = 'md',
}: {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-3.5' }
  const pct = Math.min(Math.max(percentage, 0), 100)

  const getGradient = (p: number) => {
    if (p >= 100) return 'from-emerald-400 to-emerald-500'
    if (p >= 70) return 'from-brand-400 to-brand-600'
    if (p >= 40) return 'from-amber-400 to-amber-500'
    return 'from-rose-400 to-rose-500'
  }

  return (
    <div className={`w-full bg-ink-200/70 rounded-full overflow-hidden ${heights[size]}`}>
      <div
        className={`relative h-full rounded-full bg-gradient-to-r ${getGradient(pct)} transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      >
        <div className="absolute inset-0 rounded-full bg-white/25 [mask-image:linear-gradient(to_bottom,white,transparent_60%)]" />
      </div>
    </div>
  )
}
