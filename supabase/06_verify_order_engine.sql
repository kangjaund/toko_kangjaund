-- READ ONLY — verify Phase 02 application RPC.

select
  routine_name,
  routine_type,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'create_order_v2';

select
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'create_order_v2'
order by grantee, privilege_type;
