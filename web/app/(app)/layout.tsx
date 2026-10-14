import { Grao } from '@/components/app/grao';
import { ProvedorMovimento } from '@/components/app/movimento/provedor';
import { Navegacao } from '@/components/app/navegacao';
import { RolagemSuave } from '@/components/app/rolagem-suave';
import { exigirUsuario } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await exigirUsuario();
  return (
    <ProvedorMovimento>
      <div className="flex min-h-svh">
        <RolagemSuave />
        <Grao />
        <Navegacao />
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">{children}</main>
      </div>
    </ProvedorMovimento>
  );
}
