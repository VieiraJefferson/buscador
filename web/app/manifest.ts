import type { MetadataRoute } from 'next';

// App instalável (PWA). No Android, "Partilhar → Buscador" no Gmail manda o texto do email
// direto para o Assistente.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Buscador de vagas',
    short_name: 'Buscador',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0b0c10',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    // POST: o texto do email não vai no URL (não fica em logs nem no histórico)
    share_target: {
      action: '/api/partilhar',
      method: 'POST',
      enctype: 'application/x-www-form-urlencoded',
      params: { title: 'titulo', text: 'texto' },
    },
  } as MetadataRoute.Manifest;
}
