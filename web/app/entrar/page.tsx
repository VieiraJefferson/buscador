import { FormEntrar } from './form';

export default function EntrarPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6">
      <p className="eyebrow mb-3">Buscador</p>
      <h1 className="font-display text-4xl font-black tracking-tight">Entrar</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Enviamos um código de acesso para o seu email.
      </p>
      <FormEntrar />
    </main>
  );
}
