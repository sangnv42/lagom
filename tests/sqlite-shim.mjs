// Vite 5's built-in module list predates `node:sqlite`, so inlined test modules cannot import it
// directly. This shim reaches it through Node's own require at runtime.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sqlite = require('node:sqlite');
export const DatabaseSync = sqlite.DatabaseSync;
