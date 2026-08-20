# TOKO KANG JAUND — RECOVERY PHASE 01–03

Reconstruction of the previously generated migration files. This is reconstructed from the current GitHub repository and the prior project decisions; it is not byte-for-byte recovery of the lost session files.

ROOT: `toko_kangjaund/`

For an existing database with data: use `supabase/migration_existing_db_v2.sql`.
For a new/empty database: use `supabase/schema_v2_full.sql`.

Do not deploy production payment yet. RajaOngkir and dynamic QRIS are intentionally not activated in this package.
