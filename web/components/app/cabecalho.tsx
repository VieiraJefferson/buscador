export function Cabecalho({ eyebrow, titulo, children }: { eyebrow: string; titulo: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 md:mb-8">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">{titulo}</h1>
      </div>
      {children}
    </header>
  );
}
