# Manager Library Web App

The library operations frontend is built with React, TypeScript, and Vite. It consumes the Laravel API in the sibling `test-manager-library-3145555-api` repository; it contains no business rules and does not access PostgreSQL directly.

## Run in development

Requirements: Node.js 20+ and npm.

```powershell
npm install
$env:VITE_API_URL = "http://localhost:8000/api/v1"
npm run dev
```

Open the URL printed by Vite (default: `http://localhost:5173`). You can also set `VITE_API_URL` in `.env.local`; its default points to `http://localhost:8000/api/v1`.

## Build and preview

```powershell
npm run build
npm run preview
```

## Features

- Sign-in with a Bearer token and local sign-out.
- Catalog search, category filter, pagination, create, edit, soft delete, and cover upload/removal (admin-only changes).
- Member search, registration, and active-loan lookup.
- Create loans with 1–3 items, browse loans, return items individually, and review overdue items.
- Most-borrowed-books report by date range (admin only).
- Authenticated book-cover retrieval.

User-facing interface text remains in Spanish. Fields sent to the API retain the contract's `snake_case` names.

## Container

With the sibling repositories cloned in the same parent directory, this app can also be built using `test-manager-library-3145555-infra/compose.yaml`.
