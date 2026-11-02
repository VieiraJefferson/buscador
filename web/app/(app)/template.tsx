import { TransicaoPagina } from '@/components/app/movimento/transicao-pagina';

/** Montado de novo a cada troca de rota: dá a entrada animada de cada página. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <TransicaoPagina>{children}</TransicaoPagina>;
}
