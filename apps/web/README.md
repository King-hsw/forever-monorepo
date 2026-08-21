# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## PWA

This project is a PWA, powered by [@vite-pwa/nuxt](https://vite-pwa-org.netlify.app/guide/frameworks/nuxt.html).

- **manifest.webmanifest** + service worker (`sw.js`) are generated automatically at build time
- The app shell and static assets are pre-cached for offline use; page navigations use a NetworkFirst strategy (cached pages stay available offline)
- SW registration and manifest link injection happen via the `@vite-pwa/nuxt` client plugin and the `<NuxtPwaAssets />` component in `app/app.vue`

Icons live in `public/icons/`. To change the app name, theme color or other manifest fields, edit the `pwa.manifest` section of `nuxt.config.ts`.

Note: PWA features (install prompt, offline mode) require serving the app over **HTTPS** (or `localhost`) in production.
