This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

# Adding bootstrap

https://1manstartup.com/blogs/install-bootstrap-for-nextjs-app-router

The issue with initializing in index.tsx is that Next.js API routes run independently, and they don't share the same runtime context as your main Next.js server. Each API route is essentially a serverless function that can run in isolation.

## Database Initialization

To ensure proper database initialization across different serverless instances, we have implemented centralized repository management and initialization checking. Refer to the `src/backend/utils/metadata-hack.ts` and `src/backend/datasource.ts` files for more details.