import { useEffect, useRef, useState, type FormEvent } from 'react'

import { useAuth } from '@/features/auth/useAuth'

import { useAiAssistant, type AiAction } from '../queries/ai.queries'
import type { AiContextType, AiResponse } from '../types/ai.types'
import { aiContextLabels, hasAiTimestamp, presentAiText } from '../utils/presentation'

type Props = {
  contextType: AiContextType
  contextId: string
  contextLabel: string
  revision?: string | number
  explain?: boolean
  dispatchId?: string
}

export function AiAssistantPanel(props: Props) {
  const { user } = useAuth()
  if (user?.role.code !== 'ADMINISTRADOR') return null
  // A remount resets mutation state and aborts requests on context/record changes.
  return <Assistant key={`${props.contextType}:${props.contextId}:${props.revision ?? ''}`} {...props} />
}

function Assistant({ contextType, contextId, contextLabel, explain, dispatchId }: Props) {
  const [question, setQuestion] = useState('')
  const [validation, setValidation] = useState('')
  const controller = useRef<AbortController | null>(null)
  const mutation = useAiAssistant({ context_type: contextType, context_id: contextId })

  useEffect(() => () => controller.current?.abort(), [])

  function run(action: AiAction) {
    if (mutation.isPending) return
    controller.current?.abort()
    controller.current = new AbortController()
    mutation.mutate({ action, signal: controller.current.signal })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = question.trim()
    if (value.length < 1 || value.length > 1000) {
      setValidation('La pregunta debe tener entre 1 y 1000 caracteres.')
      return
    }
    setValidation('')
    run({ operation: 'query', question: value })
  }

  return (
    <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm" aria-label="Asistente de IA">
      <h2 className="text-sm font-bold">Asistente operativo</h2>
      <p className="mt-1 text-xs text-slate">Contexto actual: {contextLabel} · {aiContextLabels[contextType]}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {explain ? <button className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-60" type="button" disabled={mutation.isPending} onClick={() => run({ operation: 'explain' })}>Explicar trazabilidad</button> : null}
        {dispatchId ? <button className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-primary disabled:opacity-60" type="button" disabled={mutation.isPending} onClick={() => run({ operation: 'difference', dispatchId })}>Analizar diferencias</button> : null}
      </div>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <label className="block text-xs font-semibold">Pregunta sobre este registro
          <textarea aria-label="Pregunta sobre este registro" className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm font-normal" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="¿Cuál es su estado actual?" />
        </label>
        {validation ? <p role="alert" className="text-xs text-red-700">{validation}</p> : null}
        <button className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-60" disabled={mutation.isPending} type="submit">Consultar</button>
      </form>
      {mutation.isPending ? <p className="mt-3 text-sm text-slate" role="status">Consultando el registro...</p> : mutation.isError ? <p className="mt-3 text-sm text-red-700" role="alert">{mutation.error.message}</p> : mutation.data ? <Result response={mutation.data} /> : null}
    </section>
  )
}

function Result({ response }: { response: AiResponse }) {
  const text = response.tipo === 'trazabilidad' ? response.resumen : response.tipo === 'analisis_diferencia' ? response.interpretacion : response.respuesta
  const includesDates = Object.values(response).flat().some((value) => typeof value === 'string' && hasAiTimestamp(value))
  return <div className="mt-4 space-y-3 border-t border-slate-100 pt-4" aria-live="polite">
    {response.fallback_used ? <p className="rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Respuesta de respaldo basada en registros</p> : null}
    <p className="whitespace-pre-wrap text-sm text-ink">{presentAiText(text)}</p>
    {response.tipo === 'trazabilidad' ? <><p className="text-xs font-semibold">Estado actual: {presentAiText(response.estado_actual)}</p><Items title="Observaciones" items={response.observaciones} /></> : null}
    {response.tipo === 'analisis_diferencia' ? <p className="text-xs text-slate">Acción sugerida: {presentAiText(response.accion_sugerida)}</p> : null}
    <Items title="Evidencia registrada" items={response.evidencia} />
    {includesDates ? <p className="text-xs text-slate">Fechas y horas en horario de Perú.</p> : null}
    <Items title="Información no disponible" items={response.informacion_no_disponible} />
    <Items title="Advertencias" items={response.advertencias} />
  </div>
}

function Items({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null
  return <div><h3 className="text-xs font-semibold text-slate">{title}</h3><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-slate">{items.map((item, index) => <li key={index}>{presentAiText(item)}</li>)}</ul></div>
}
