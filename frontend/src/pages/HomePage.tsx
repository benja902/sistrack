export function HomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-5xl items-center justify-center">
      <div className="max-w-lg text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-primary">Sitrack</p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Base administrativa lista
        </h1>
        <p className="mt-4 text-pretty text-muted-foreground">
          La estructura inicial está preparada para incorporar los módulos de trazabilidad de Kotosh y Canchán.
        </p>
      </div>
    </section>
  )
}
