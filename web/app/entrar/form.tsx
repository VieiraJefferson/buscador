'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enviarCodigo, verificarCodigo } from './actions';

const ESPERA_REENVIO = 60; // segundos, o mesmo intervalo do Supabase

export function FormEntrar() {
  const [envio, enviar, enviando] = useActionState(enviarCodigo, null);
  const [verificacao, verificar, verificando] = useActionState(verificarCodigo, null);
  const [trocado, setTrocado] = useState<typeof envio>(null);

  // Fase do código: o último envio deu um email e você não pediu para trocar.
  const email = envio?.email && envio !== trocado ? envio.email : null;

  if (!email) {
    return (
      <form action={enviar} className="flex flex-col gap-3">
        <Input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" />
        <Button type="submit" size="lg" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar código'}
        </Button>
        {envio && !envio.ok && <p className="text-sm text-destructive">{envio.msg}</p>}
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-sea">{envio?.msg}</p>
      <form action={verificar} className="flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <Input
          name="codigo"
          required
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,12}"
          maxLength={12}
          placeholder="Código de 6 dígitos"
          className="h-12 text-center font-mono text-xl tracking-[0.4em] md:text-xl"
        />
        <Button type="submit" size="lg" disabled={verificando}>
          {verificando ? 'Entrando…' : 'Entrar'}
        </Button>
        {verificacao && !verificacao.ok && <p className="text-sm text-destructive">{verificacao.msg}</p>}
      </form>
      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setTrocado(envio)}>
          Trocar email
        </Button>
        <form action={enviar}>
          <input type="hidden" name="email" value={email} />
          {/* key: cada novo envio recomeça a contagem */}
          <BotaoReenviar key={JSON.stringify(envio) + String(enviando)} enviando={enviando} />
        </form>
      </div>
    </div>
  );
}

function BotaoReenviar({ enviando }: { enviando: boolean }) {
  const [faltam, setFaltam] = useState(ESPERA_REENVIO);
  useEffect(() => {
    const id = setInterval(() => setFaltam((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={enviando || faltam > 0}>
      {faltam > 0 ? `Reenviar em ${faltam}s` : 'Reenviar código'}
    </Button>
  );
}
