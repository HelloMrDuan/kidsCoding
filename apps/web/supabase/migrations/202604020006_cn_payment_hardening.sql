alter table orders
  add column if not exists amount_cny integer,
  add column if not exists qr_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error_code text,
  add column if not exists last_error_message text,
  add column if not exists provider_status text;

create index if not exists orders_user_created_idx
  on orders (user_id, created_at desc);
