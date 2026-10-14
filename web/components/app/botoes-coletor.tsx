'use client';

import { Loader2, Play, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Botões para disparar o coletor no GitHub Actions (rota /api/coletor, ADR-0003). */
export function BotoesColetor({ compacto = false, aoDisparar }: { compacto?: boolean; aoDisparar?: () => void }) {
  const [enviando, setEnviando] = useState<string | null>(null);

  async function disparar(workflow: 'varrer' | 'descobrir') {
    setEnviando(workflow);
    try {
      const r = await fetch('/api/coletor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflow }),
      });
      if (r.ok) {
        toast.success(workflow === 'varrer' ? 'Varredura iniciada' : 'Descoberta iniciada', {
          description: 'Acompanhe o estado na tela do Coletor.',
        });
        aoDisparar?.();
      } else {
        toast.error('Não foi possível iniciar agora.');
      }
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => disparar('varrer')} disabled={!!enviando} size={compacto ? 'sm' : 'default'}>
        {enviando === 'varrer' ? <Loader2 className="animate-spin" /> : <Play />}
        Rodar varredura
      </Button>
      <Button
        variant="outline"
        onClick={() => disparar('descobrir')}
        disabled={!!enviando}
        size={compacto ? 'sm' : 'default'}
      >
        {enviando === 'descobrir' ? <Loader2 className="animate-spin" /> : <Search />}
        Rodar descoberta
      </Button>
    </div>
  );
}
