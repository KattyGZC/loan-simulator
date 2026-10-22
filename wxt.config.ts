import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: 'Loan Simulator',
    description: 'Simulate loans from any bank or credit union, with extra principal payments.',
    permissions: ['storage', 'sidePanel'],
    action: {
      default_title: 'Open Loan Simulator',
    },
  },
});
