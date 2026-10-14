'use client';

import { X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

/** Campo de tags: digite e Enter (ou vírgula) para adicionar; X para remover. */
export function Tags({ valor, aoMudar, placeholder }: { valor: string[]; aoMudar: (v: string[]) => void; placeholder?: string }) {
  const [texto, setTexto] = useState('');
  const adicionar = () => {
    const novo = texto.trim().replace(/,$/, '');
    if (novo && !valor.includes(novo)) aoMudar([...valor, novo]);
    setTexto('');
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {valor.map((t) => (
          <Badge key={t} variant="soft" className="py-1 pr-1">
            {t}
            <button type="button" onClick={() => aoMudar(valor.filter((x) => x !== t))} aria-label={`Remover ${t}`} className="rounded-full p-0.5 hover:bg-elev">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            adicionar();
          }
        }}
        onBlur={adicionar}
        placeholder={placeholder ?? 'Digite e Enter'}
      />
    </div>
  );
}
