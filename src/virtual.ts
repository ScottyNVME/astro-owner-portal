import type { Plugin } from 'vite';
import type { ResolvedOptions } from './config.js';

const VIRTUAL_ID = 'virtual:owner-portal/config';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export type VirtualConfig = ResolvedOptions & { version: string };

export function ownerPortalConfigPlugin(options: VirtualConfig): Plugin {
  return {
    name: 'owner-portal:virtual-config',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      const serialized = JSON.stringify(options, null, 2);
      return `export default ${serialized};\n`;
    },
  };
}

export { VIRTUAL_ID };
