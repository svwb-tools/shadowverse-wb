import { CLASS_COLORS } from '../constants'
import type { ClassName } from '../types'

export function ClassDot({ className, size = 8 }: { className: ClassName; size?: number }) {
  return (
    <span
      title={className}
      className="inline-block shrink-0 rotate-45 rounded-[2px]"
      style={{ width: size, height: size, backgroundColor: CLASS_COLORS[className] }}
    />
  )
}
