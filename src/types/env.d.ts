// Astro (and Vite) inject `import.meta.env` at build time. Our package ships
// route handlers that Astro/Vite will compile in the host site — but for our
// own tsc pass we need to declare the shape so the lib files typecheck.
interface ImportMetaEnv {
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  // Index access (e.g. `import.meta.env.JWT_SECRET`) returns string | undefined.
  // Known boolean flags come through the typed properties above.
  readonly env: ImportMetaEnv & Record<string, string | undefined>;
}
