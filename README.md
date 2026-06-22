# @workspace/api-server

You’re conversations matched

## Getting Started

```bash
# Install dependencies
npm install

# dev
npm run dev  # export NODE_ENV=development && pnpm run build && pnpm run start

# build
npm run build  # node ./build.mjs

# start
npm run start  # node --enable-source-maps ./dist/index.mjs

# typecheck
npm run typecheck  # tsc -p tsconfig.json --noEmit

# test
npm run test  # node --import tsx/esm --test src/routes/github.test.ts
```

## Stack

- Node.js
- TypeScript
- Express
- Drizzle ORM

## CI

This project uses GitHub Actions for continuous integration. See `.github/workflows/ci.yml`.

## License

MIT
