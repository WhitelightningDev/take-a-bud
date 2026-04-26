type SparklineProps = {
  points: number[]
}

export function Sparkline({ points }: SparklineProps) {
  const w = 220
  const h = 56
  const min = Math.min(...points)
  const max = Math.max(...points)

  const d = points
    .map((value, index) => {
      const x = (index / (points.length - 1)) * w
      const y = max === min ? h / 2 : h - ((value - min) / (max - min)) * h
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg className="adminSpark" viewBox={`0 0 ${w} ${h}`} role="presentation" aria-hidden="true">
      <path className="adminSpark__path" d={d} />
    </svg>
  )
}
