import { describe, expect, it } from 'vitest';
import { ehCelular, linkGmail, linkMailto } from './email-link';

// Corpo longo e com acentos: o caso que antes caía no "só copiar" (mailto > 1800).
const corpo = `Olá, equipa.\n\n${'Experiência com React, Node e Python. '.repeat(80)}\n\nP.S. Se preferir não receber mais emails, responda.`;
const email = { para: 'rh@acme.es', assunto: 'Candidatura: Dev Full-stack', corpo };

describe('linkGmail', () => {
  it('abre o compositor do Gmail web com destinatário, assunto e corpo completos', () => {
    const url = new URL(linkGmail(email));
    expect(url.origin).toBe('https://mail.google.com');
    expect(url.searchParams.get('view')).toBe('cm');
    expect(url.searchParams.get('to')).toBe('rh@acme.es');
    expect(url.searchParams.get('su')).toBe(email.assunto);
    expect(url.searchParams.get('body')).toBe(corpo);
  });

  it('sem destinatário não manda "to"', () => {
    expect(new URL(linkGmail({ ...email, para: null })).searchParams.has('to')).toBe(false);
  });
});

describe('linkMailto', () => {
  it('não corta nem desiste de textos longos', () => {
    const url = linkMailto(email);
    expect(url.length).toBeGreaterThan(1800);
    expect(url.startsWith('mailto:rh@acme.es?')).toBe(true);
    expect(decodeURIComponent(url.split('&body=')[1]!)).toBe(corpo);
  });
});

describe('ehCelular', () => {
  it('reconhece Android e iPhone e não confunde com o PC', () => {
    expect(ehCelular('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile')).toBe(true);
    expect(ehCelular('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(true);
    expect(ehCelular('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140')).toBe(false);
  });
});
