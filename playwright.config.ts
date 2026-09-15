import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3107', trace: 'retain-on-failure' },
  webServer: {
    command: 'node node_modules/next/dist/bin/next start -p 3107',
    env: { NEXT_DIST_DIR: '.next-verification' },
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
