import preact from '@preact/preset-vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  vite: () => ({
    plugins: [preact()],
  }),
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'sidePanel'],
    action: {
      default_title: '__MSG_actionTitle__',
    },
  },
});
