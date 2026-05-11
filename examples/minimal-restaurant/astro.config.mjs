import { defineConfig } from 'astro/config';
import ownerPortal from '@scottynvme/owner-portal';

export default defineConfig({
  output: 'static',
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
        { path: 'src/data/restaurant.ts', allowedFields: ['hours', 'phones'] },
      ],
      imageUploadDir: 'public/img/food',
      productionDomain: 'www.example.com',
      contactInfo: 'Text Scott',
      systemPromptExtra: 'This is an example restaurant for smoke-testing.',
    }),
  ],
});
