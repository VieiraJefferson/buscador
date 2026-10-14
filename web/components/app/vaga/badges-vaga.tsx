import { MailCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { REGIMES, type EstadoCandidatura, type Regime } from '@/lib/tipos';
import { rotuloEstado } from '@/lib/vaga';

/** Nota da IA: turquesa a partir de 4 (gera email). */
export function BadgeNota({ nota }: { nota: number | null }) {
  if (!nota) return null;
  return <Badge variant={nota >= 4 ? 'sea' : 'soft'}>nota {nota}/5</Badge>;
}

/** As etiquetas de uma vaga, iguais na lista e no detalhe. */
export function BadgesVaga({
  regime,
  consultoria,
  temEmail = false,
  estado,
  bloqueada = false,
}: {
  regime: Regime;
  consultoria: boolean;
  temEmail?: boolean;
  estado?: EstadoCandidatura;
  bloqueada?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant="outline">{REGIMES[regime]}</Badge>
      {consultoria && <Badge variant="warning">consultoria</Badge>}
      {temEmail && (
        <Badge variant="sea">
          <MailCheck className="size-3" />
          email pronto
        </Badge>
      )}
      {estado && estado !== 'a_enviar' && <Badge>{rotuloEstado(estado)}</Badge>}
      {bloqueada && <Badge variant="warning">empresa bloqueada</Badge>}
    </div>
  );
}
