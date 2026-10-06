import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Milk,
  PackageCheck,
  ShoppingCart,
  Truck,
} from 'lucide-react'

import type { TraceabilityEvent } from '../types/traceability.types'
import { areaStyles, type TraceabilityArea } from './traceability-map.config'

export type TraceabilityNodeData = {
  event: TraceabilityEvent
  area: TraceabilityArea
  label: string
  sequence: number
  active: boolean
}

export type TraceabilityGraphNode = Node<TraceabilityNodeData, 'traceabilityEvent'>

const areaIcons = {
  production: Milk,
  inventory: Boxes,
  commercial: ShoppingCart,
  logistics: PackageCheck,
  transport: Truck,
  reception: ClipboardCheck,
  incident: AlertTriangle,
}

export function TraceabilityEventNode({ data, selected }: NodeProps<TraceabilityGraphNode>) {
  const style = areaStyles[data.area]
  const Icon = areaIcons[data.area]
  const completed = data.event.event_type === 'incident_closed'

  return (
    <article
      className={`w-48 rounded-2xl border bg-white p-3 shadow-md transition-all duration-300 ${
        selected || data.active ? 'scale-105 shadow-xl ring-4' : 'hover:-translate-y-1 hover:shadow-lg'
      }`}
      style={{
        borderColor: style.color,
        boxShadow: data.active ? `0 12px 30px ${style.color}35` : undefined,
        '--tw-ring-color': `${style.color}28`,
      } as React.CSSProperties}
    >
      <Handle className="!size-2 !border-0 !opacity-0" position={Position.Left} type="target" />
      <Handle className="!size-2 !border-0 !opacity-0" position={Position.Right} type="source" />
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ background: style.soft, color: style.color }}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ background: style.soft, color: style.color }}>
          {style.label}
        </span>
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate">Evento {data.sequence}</p>
      <h3 className="mt-1 text-sm font-bold leading-tight text-ink">{data.label}</h3>
      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-slate-600">{data.event.description}</p>
      {completed ? <CheckCircle2 className="absolute -right-2 -top-2 size-6 rounded-full bg-white text-emerald-600" /> : null}
    </article>
  )
}
