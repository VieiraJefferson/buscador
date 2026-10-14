import { LogOut } from 'lucide-react';
import { sair } from '@/app/entrar/actions';
import { Button } from '@/components/ui/button';

export function BotaoSair({ className }: { className?: string }) {
  return (
    <form action={sair} className={className}>
      <Button type="submit" variant="ghost" size="sm" className="text-ink-dim">
        <LogOut />
        Sair
      </Button>
    </form>
  );
}
