'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { enviarLink } from './actions';

export function FormEntrar() {
  const [estado, acao, pendente] = useActionState(enviarLink, null);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Input name="email" type="email" required autoComplete="email" placeholder="seu@email.com" />
      <Button type="submit" size="lg" disabled={pendente}>
        {pendente ? 'Enviando…' : 'Enviar link'}
      </Button>
      {estado && (
        <p className={estado.ok ? 'text-sm text-sea' : 'text-sm text-destructive'}>{estado.msg}</p>
      )}
    </form>
  );
}
