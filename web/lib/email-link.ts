// Links para abrir o email de candidatura já preenchido (ADR-0006).
// PC: o compositor do Gmail web, porque o mailto: no Windows vai para o app padrão do sistema
// (Outlook/Mail) e tem limite curto de tamanho. Celular: mailto:, que o Android e o iOS
// entregam inteiro ao app de email padrão (o Gmail, no caso do Jefferson).

export type EmailPronto = { para: string | null; assunto: string; corpo: string };

export function linkGmail({ para, assunto, corpo }: EmailPronto): string {
  const p = new URLSearchParams({ view: 'cm', fs: '1' });
  if (para) p.set('to', para);
  p.set('su', assunto);
  p.set('body', corpo);
  return `https://mail.google.com/mail/?${p.toString()}`;
}

export function linkMailto({ para, assunto, corpo }: EmailPronto): string {
  return `mailto:${para ?? ''}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export const ehCelular = (userAgent: string) => /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);
