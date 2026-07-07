import { useMemo, useState } from 'react'
import { CLASS_COLORS } from '../constants'
import type { Deck } from '../types'

export interface ScatterPoint {
  deck: Deck
  expected: number
  entered: number
  total: number
  /** 自分が使わないデッキ: 自分のデッキ群への勝率からの逆算値 */
  estimated?: boolean
}

const W = 640
const H = 320
const M = { left: 46, right: 18, top: 20, bottom: 38 }

export function ScatterView({ points }: { points: ScatterPoint[] }) {
  const [hover, setHover] = useState<ScatterPoint | null>(null)

  const domain = useMemo(() => {
    const xs = points.map((p) => p.expected)
    const lo = Math.max(0, Math.min(45, Math.floor(Math.min(...xs) - 5)))
    const hi = Math.min(100, Math.max(55, Math.ceil(Math.max(...xs) + 5)))
    return { lo, hi }
  }, [points])

  const innerW = W - M.left - M.right
  const innerH = H - M.top - M.bottom
  const sx = (v: number) => M.left + ((v - domain.lo) / (domain.hi - domain.lo)) * innerW
  const sy = (power: number) => M.top + (1 - (power - 0.5) / 10) * innerH

  const step = domain.hi - domain.lo > 35 ? 10 : 5
  const xTicks: number[] = []
  for (let v = Math.ceil(domain.lo / step) * step; v <= domain.hi; v += step) xTicks.push(v)
  const yTicks = [2, 4, 6, 8, 10]
  // SVGの属性は var() を解釈しないため、テーマ変数は style で当てる
  const mutedText = { fill: 'var(--ink-muted)' } as const
  const gridLine = { stroke: 'var(--chart-grid)' } as const

  return (
    <div className="rounded-lg border border-line bg-panel-2 p-4">
      <h3 className="mb-1.5 px-1 text-sm font-semibold tracking-wide">2軸ビュー（対環境期待勝率 × デッキパワー）</h3>
      <p className="px-1 text-[11px] leading-relaxed text-muted">
        右下に落ちるデッキは「相性は良いがパワー不足」の相性番長候補です。
      </p>
      <div className="mb-3 mt-3 flex flex-col gap-y-1.5 px-1 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="5" style={{ fill: 'var(--ink-muted)' }} />
          </svg>
          自分が使うデッキ
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle
              cx="6" cy="6" r="4.5" fillOpacity="0.25" strokeWidth="1.5" strokeDasharray="2.5 2"
              style={{ fill: 'var(--ink-muted)', stroke: 'var(--ink-muted)' }}
            />
          </svg>
          環境のみのデッキ（自分のデッキへの勝率から逆算）
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="期待勝率とパワーの散布図">
          {/* グリッド */}
          {xTicks.map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} y1={M.top} x2={sx(v)} y2={H - M.bottom} style={gridLine} />
              <text x={sx(v)} y={H - M.bottom + 14} textAnchor="middle" fontSize={10} style={mutedText}>
                {v}
              </text>
            </g>
          ))}
          {yTicks.map((p) => (
            <g key={`y${p}`}>
              <line x1={M.left} y1={sy(p)} x2={W - M.right} y2={sy(p)} style={gridLine} />
              <text x={M.left - 8} y={sy(p) + 3.5} textAnchor="end" fontSize={10} style={mutedText}>
                {p}
              </text>
            </g>
          ))}

          {/* 基準線: 勝率50% とパワー中央 */}
          {50 >= domain.lo && 50 <= domain.hi && (
            <line
              x1={sx(50)} y1={M.top} x2={sx(50)} y2={H - M.bottom}
              style={{ stroke: 'var(--chart-ref)' }} strokeDasharray="4 4"
            />
          )}
          <line
            x1={M.left} y1={sy(5.5)} x2={W - M.right} y2={sy(5.5)}
            style={{ stroke: 'var(--chart-ref-weak)' }} strokeDasharray="4 4"
          />

          {/* 象限ラベル */}
          <text x={W - M.right - 6} y={M.top + 12} textAnchor="end" fontSize={10} style={mutedText} opacity={0.75}>
            本命
          </text>
          <text x={W - M.right - 6} y={H - M.bottom - 8} textAnchor="end" fontSize={10} style={mutedText} opacity={0.75}>
            相性番長（パワー不足注意）
          </text>
          <text x={M.left + 6} y={M.top + 12} textAnchor="start" fontSize={10} style={mutedText} opacity={0.75}>
            地力はあるが逆風
          </text>

          {/* 軸ラベル */}
          <text x={M.left + innerW / 2} y={H - 6} textAnchor="middle" fontSize={10} style={mutedText}>
            対環境期待勝率（%）
          </text>
          <text
            x={13} y={M.top + innerH / 2} textAnchor="middle" fontSize={10} style={mutedText}
            transform={`rotate(-90 13 ${M.top + innerH / 2})`}
          >
            デッキパワー
          </text>

          {/* 点と直接ラベル */}
          {points.map((p) => {
            const labelLeft = p.expected > (domain.lo + domain.hi) / 2
            return (
              <g
                key={p.deck.id}
                onMouseEnter={() => setHover(p)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <circle cx={sx(p.expected)} cy={sy(p.deck.power)} r={12} fill="transparent" />
                {p.estimated ? (
                  <circle
                    cx={sx(p.expected)} cy={sy(p.deck.power)} r={6.5}
                    fill={CLASS_COLORS[p.deck.className]} fillOpacity={0.22}
                    stroke={CLASS_COLORS[p.deck.className]} strokeWidth={1.5} strokeDasharray="3 2.5"
                  />
                ) : (
                  <circle
                    cx={sx(p.expected)} cy={sy(p.deck.power)} r={7}
                    fill={CLASS_COLORS[p.deck.className]} strokeWidth={2}
                    style={{ stroke: 'var(--chart-surface)' }}
                  />
                )}
                <text
                  x={sx(p.expected) + (labelLeft ? -11 : 11)} y={sy(p.deck.power) + 4}
                  textAnchor={labelLeft ? 'end' : 'start'} fontSize={11}
                  style={{ fill: 'var(--ink-fg)' }}
                >
                  {p.deck.name}
                </text>
              </g>
            )
          })}
        </svg>

        {hover && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-abyss px-2.5 py-1.5 text-xs shadow-lg"
            style={{
              left: `${(sx(hover.expected) / W) * 100}%`,
              top: `${((sy(hover.deck.power) - 12) / H) * 100}%`,
            }}
          >
            <div className="font-semibold">{hover.deck.name}</div>
            <div className="mt-0.5 text-muted">
              {hover.estimated ? '対自分デッキ勝率（逆算）' : '期待勝率'}{' '}
              <span className="font-display font-semibold text-fg">{hover.expected.toFixed(1)}%</span>
              ・パワー {hover.deck.power}・入力 {hover.entered}/{hover.total}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
