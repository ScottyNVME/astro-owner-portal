import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import ownerPortal from '@scottynvme/owner-portal';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [
    ownerPortal({
      adminPath: '/studio',
      brand: {
        name: 'Example Business',
        logo: '/img/logo.png',
        accentColor: '#475569',
      },
      allowedFiles: [
        { path: 'src/data/content.ts' },
        { path: 'src/data/site.ts', allowedFields: ['hours', 'hoursDisplay', 'phones'] },
      ],
      imageUploadDir: 'public/img/uploads',
      productionDomain: 'www.example.com',
      contactInfo: 'Text the site owner',
      systemPromptExtra: `Data shapes for this site:

src/data/content.ts exports a \`content\` array of sections. Each section has { id, title, items[] }. Items are { name, detail }.

src/data/site.ts exports a \`site\` object. Owners may only edit:
- hours: weekday → time string map
- hoursDisplay: { label, value } shown in the header
- phones: array of { label, number (E.164), display (human-friendly) }`,
    }),
  ],
});
