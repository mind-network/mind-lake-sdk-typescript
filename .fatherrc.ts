import { defineConfig } from 'father';

export default defineConfig({
  esm: {output: 'dist'},
  cjs: {output: 'dist'},
  prebundle: {},
});
