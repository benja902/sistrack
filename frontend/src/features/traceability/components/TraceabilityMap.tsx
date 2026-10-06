import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
} from '@xyflow/react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { TraceabilityEvent } from '../types/traceability.types'
import {
  TraceabilityEventNode,
  type TraceabilityGraphNode,
} from './TraceabilityEventNode'
import {
  areaStyles,
  eventArea,
  eventLabels,
  type TraceabilityArea,
} from './traceability-map.config'

type Props = {
  events: TraceabilityEvent[]
  selectedId: string | null
  onSelect: (event: TraceabilityEvent) => void
}

function nodePosition(index: number) {
  const columns = 4
  const row = Math.floor(index / columns)
  const positionInRow = index % columns
  const column = row % 2 === 0 ? positionInRow : columns - 1 - positionInRow
  return { x: column * 245, y: row * 210 }
}

export function TraceabilityMap({ events, selectedId, onSelect }: Props) {
  const chronologicalEvents = useMemo(
    () => [...events].sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)),
    [events],
  )
  const [playIndex, setPlayIndex] = useState<number | null>(null)
  const [hovered, setHovered] = useState<TraceabilityEvent | null>(null)
  const isPlaying = playIndex !== null && playIndex < chronologicalEvents.length - 1

  useEffect(() => {
    if (playIndex === null || playIndex >= chronologicalEvents.length - 1) return
    const timer = window.setTimeout(() => {
      const next = playIndex + 1
      setPlayIndex(next)
      onSelect(chronologicalEvents[next])
    }, 950)
    return () => window.clearTimeout(timer)
  }, [chronologicalEvents, onSelect, playIndex])

  const nodes = useMemo<TraceabilityGraphNode[]>(
    () => chronologicalEvents.map((event, index) => ({
      id: event.id,
      type: 'traceabilityEvent',
      position: nodePosition(index),
      data: {
        event,
        area: eventArea(event),
        label: eventLabels[event.event_type] ?? event.event_type,
        sequence: index + 1,
        active: playIndex === index,
      },
      selected: selectedId === event.id,
      draggable: false,
      connectable: false,
    })),
    [chronologicalEvents, playIndex, selectedId],
  )
  const edges = useMemo<Edge[]>(
    () => nodes.slice(0, -1).map((node, index) => {
      const target = nodes[index + 1]
      const area = node.data.area
      return {
        id: `${node.id}-${target.id}`,
        source: node.id,
        target: target.id,
        type: 'smoothstep',
        animated: playIndex !== null && index < playIndex,
        style: { stroke: areaStyles[area].color, strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: areaStyles[area].color },
      }
    }),
    [nodes, playIndex],
  )

  function startPlayback() {
    setPlayIndex(0)
    onSelect(chronologicalEvents[0])
  }

  return (
    <div className="h-[590px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-inner">
      <ReactFlow
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.45}
        maxZoom={1.5}
        nodes={nodes}
        edges={edges}
        nodeTypes={{ traceabilityEvent: TraceabilityEventNode }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => onSelect(node.data.event)}
        onNodeMouseEnter={(_, node) => setHovered(node.data.event)}
        onNodeMouseLeave={() => setHovered(null)}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.3} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => areaStyles[node.data.area as TraceabilityArea].color}
          maskColor="rgba(241, 245, 249, 0.72)"
        />
        <Panel position="top-left">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-md backdrop-blur">
            <button className="inline-flex h-8 items-center gap-2 rounded-lg bg-primary px-3 text-xs font-semibold text-white" onClick={isPlaying ? () => setPlayIndex(null) : startPlayback} type="button">
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {isPlaying ? 'Pausar' : 'Reproducir recorrido'}
            </button>
            <button className="grid size-8 place-items-center rounded-lg border border-slate-200 text-slate hover:bg-slate-50" onClick={() => setPlayIndex(null)} title="Detener reproducción" type="button"><RotateCcw className="size-3.5" /></button>
          </div>
        </Panel>
        {hovered ? (
          <Panel position="top-right">
            <div className="max-w-64 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Vista rápida</p>
              <p className="mt-1 text-sm font-semibold">{eventLabels[hovered.event_type] ?? hovered.event_type}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate">{hovered.description}</p>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  )
}
