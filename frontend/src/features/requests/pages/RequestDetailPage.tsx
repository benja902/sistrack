import { ArrowLeft, CheckCircle2, LockKeyhole, PackageCheck, ReceiptText } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ReceiptStatusBadge, RequestStatusBadge } from '../components/RequestStatusBadge'
import { RequestState } from '../components/RequestState'
import { RequestWorkflow } from '../components/RequestWorkflow'
import {
  useAuthorizeGuineaPigRequest,
  useConfirmGuineaPigRequest,
  useGuineaPigRequest,
  useRegisterGuineaPigRequestPayment,
} from '../queries/requests.queries'

const dateFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' })
const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' })

function Field({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate">{label}</span><strong className="mt-1 block text-sm text-ink">{value}</strong></div>
}

export function RequestDetailPage() {
  const { requestId = '' } = useParams()
  const [receiptReference, setReceiptReference] = useState('')
  const requestQuery = useGuineaPigRequest(requestId)
  const confirmMutation = useConfirmGuineaPigRequest(requestId)
  const paymentMutation = useRegisterGuineaPigRequestPayment(requestId)
  const authorizeMutation = useAuthorizeGuineaPigRequest(requestId)

  if (requestQuery.isPending) return <RequestState />
  if (requestQuery.isError) return <RequestState onRetry={() => requestQuery.refetch()} />
  const request = requestQuery.data

  function registerPayment(event: FormEvent) {
    event.preventDefault()
    paymentMutation.mutate(receiptReference)
  }

  const mutationError = confirmMutation.error ?? paymentMutation.error ?? authorizeMutation.error

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <div className="flex items-center justify-between text-xs text-slate"><p>Solicitudes / <span className="font-semibold text-ink">{request.request_code}</span></p><Link className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline" to="/solicitudes"><ArrowLeft className="size-4" aria-hidden="true" /> Volver</Link></div>

      <section className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Solicitud de cuyes</p><h1 className="mt-1 text-2xl font-bold text-ink">{request.request_code}</h1><p className="mt-1 text-sm text-slate">Creada por {request.created_by_user.full_name} el {dateTimeFormatter.format(new Date(request.created_at))}</p></div><div className="flex flex-wrap gap-2"><RequestStatusBadge status={request.status} /><ReceiptStatusBadge status={request.receipt_status} /></div></div>
        <div className="mt-6"><RequestWorkflow current={request.status} /></div>
      </section>

      <section className="grid gap-4 rounded-xl border border-border-subtle bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cliente" value={request.customer_name} />
        <Field label="Fecha solicitada" value={dateFormatter.format(new Date(`${request.requested_for}T12:00:00`))} />
        <Field label="Centro" value={request.inventory_balance.center.name} />
        <Field label="Categoría" value={request.inventory_balance.category} />
        <Field label="Cantidad" value={`${request.requested_quantity} ejemplares`} />
        <Field label="Existencia física actual" value={request.inventory_balance.physical_quantity} />
        <Field label="Reservado actual" value={request.inventory_balance.reserved_quantity} />
        <Field label="Disponible actual" value={request.inventory_balance.available_quantity} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><LockKeyhole className="size-4 text-amber-600" aria-hidden="true" /><h2 className="text-sm font-semibold text-ink">Reserva de inventario</h2></div>{request.reservation ? <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Cantidad reservada" value={request.reservation.quantity} /><Field label="Estado" value={request.reservation.status === 'ACTIVE' ? 'Activa' : 'Liberada'} /></div> : <p className="mt-4 text-sm text-slate">Todavía no existe una reserva. La solicitud no afecta el inventario disponible.</p>}</div>
        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ReceiptText className="size-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold text-ink">Boleta y autorización</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Boleta" value={request.receipt_reference ?? 'Pendiente'} /><Field label="Autorizado por" value={request.authorized_by_user?.full_name ?? 'Pendiente'} /></div></div>
      </section>

      {request.status !== 'AUTHORIZED' ? (
        <section className="rounded-xl border border-border-subtle bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Siguiente acción</h2>
          {request.status === 'REQUESTED' ? <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-sm text-slate">Comprueba la disponibilidad actual y crea la reserva.</p><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={confirmMutation.isPending} type="button" onClick={() => confirmMutation.mutate()}><PackageCheck className="size-4" aria-hidden="true" /> Confirmar disponibilidad</button></div> : null}
          {request.status === 'AVAILABILITY_CONFIRMED' ? <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={registerPayment}><label className="flex-1"><span className="mb-1.5 block text-xs font-semibold text-ink">Referencia de boleta</span><input className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-primary" required value={receiptReference} onChange={(event) => setReceiptReference(event.target.value)} /></label><button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={paymentMutation.isPending} type="submit">Registrar pago y boleta</button></form> : null}
          {request.status === 'PAID' ? <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-sm text-slate">La boleta está registrada. Autoriza la solicitud para continuar posteriormente en Logística.</p><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={authorizeMutation.isPending} type="button" onClick={() => authorizeMutation.mutate()}><CheckCircle2 className="size-4" aria-hidden="true" /> Autorizar solicitud</button></div> : null}
          {mutationError ? <p className="mt-4 text-sm font-medium text-red-600">{mutationError.message}</p> : null}
        </section>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex gap-3"><CheckCircle2 className="size-5 shrink-0 text-emerald-700" aria-hidden="true" /><div><h2 className="text-sm font-semibold text-emerald-900">Solicitud autorizada</h2><p className="mt-1 text-xs text-emerald-800">La reserva permanece activa y la existencia física no ha disminuido. El siguiente proceso corresponde a Logística.</p></div></div></section>
      )}
    </div>
  )
}
