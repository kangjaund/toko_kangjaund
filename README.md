# Phase 03 FIX — CartProvider TypeScript Error

## Exact replacement path

Replace the existing file:

`app/components/cart/CartProvider.tsx`

with:

`CartProvider.tsx`

## Why this fix is needed

Vercel reported:

`Type error: Expected 1 arguments, but got 2.`

The problem was in `addItem`: the dependency array `[]` was accidentally being passed as a second argument to `setItems()` instead of to `useCallback()`.

This replacement only fixes that parenthesis/argument placement. The cart behavior and UI-facing API are preserved.

## GitHub action

1. Open `app/components/cart/`
2. Replace `CartProvider.tsx`
3. Commit the change
4. Wait for Vercel to redeploy

Do not change the RajaOngkir files for this fix.
