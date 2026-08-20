# TOKO KANG JAUND — PHASE 02 INTEGRATED

This package is based on the uploaded project source, with Phase 02
Order Engine added without replacing the existing UI or legacy order API.

## Added

app/api/orders-v2/route.ts
lib/ecommerce/order-engine.ts
supabase/06_verify_order_engine.sql

The existing:
- app/api/orders/route.ts
- checkout-form.tsx
- cart UI
- lib/supabase/server.ts
are preserved.

## Database

`supabase/05_order_engine_rpc.sql` was already present in the uploaded
project and has already been executed successfully in Supabase.

`06_verify_order_engine.sql` is read-only.

## IMPORTANT

The new `/api/orders-v2` endpoint is NOT wired to the current UI yet.
The legacy `/api/orders` remains the active checkout until Phase 03.

Do not run a real order test yet, because the current RPC reserves/decrements
finite stock when the order is created. Payment expiry/restoration will be
handled in the payment lifecycle phase.

## Parent folder

toko_kangjaund/
├── app/api/orders-v2/route.ts
├── lib/ecommerce/order-engine.ts
└── supabase/06_verify_order_engine.sql

No existing UI files were replaced.
