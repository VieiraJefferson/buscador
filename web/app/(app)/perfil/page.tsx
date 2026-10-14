import { BotaoSair } from '@/components/app/botao-sair';
import { Cabecalho } from '@/components/app/cabecalho';
import { exigirUsuario } from '@/lib/auth';
import { carregarPerfil } from '@/lib/perfil';
import { EditorPerfil } from './editor';

export const dynamic = 'force-dynamic';

export default async function PerfilPage() {
  const { supabase, user } = await exigirUsuario();
  const { dados, salvo } = await carregarPerfil(supabase, user.id);
  return (
    <div>
      <Cabecalho eyebrow="Usado nos filtros, nas notas e nos emails" titulo="Perfil">
        {/* No computador o Sair fica na barra lateral */}
        <BotaoSair className="md:hidden" />
      </Cabecalho>
      {!salvo && (
        <p className="mb-4 rounded-lg bg-soft p-3 text-sm text-ink-dim">
          Estes são os dados iniciais (de config/perfil.yaml). Salve uma vez para o buscador passar a usar o perfil do site.
        </p>
      )}
      <EditorPerfil inicial={dados} />
    </div>
  );
}
