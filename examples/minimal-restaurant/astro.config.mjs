import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import ownerPortal from '@scottynvme/owner-portal';

export default defineConfig({
  output: 'static',
  adapter: vercel(),
  integrations: [
    ownerPortal({
      adminPath: '/pascual',
      brand: {
        name: 'Example Restaurant',
        logo: '/img/logo.png',
        accentColor: '#c0532b',
      },
      allowedFiles: [
        { path: 'src/data/menu.ts' },
        { path: 'src/data/restaurant.ts', allowedFields: ['hours', 'hoursDisplay', 'phones'] },
      ],
      imageUploadDir: 'public/img/food',
      productionDomain: 'www.example.com',
      contactInfo: 'Text Scott',
      systemPromptExtra: `Data shapes for this site:

src/data/menu.ts exports a \`menu\` array of categories. Each category has { id, title, image, items[] }. Items are { name, price, description }. Prices are strings like "15.00" with two decimals, no $ sign.

src/data/restaurant.ts exports a \`restaurant\` object. Owners may only edit:
- hours: weekday → time string map
- hoursDisplay: { label, value } shown in the header
- phones: array of { label, number (E.164), display (human-friendly) }`,
    }),
  ],
});
