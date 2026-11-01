-- Additive: legacy preferences and payment history remain intact.
alter table orders add column mercadopago_order_id text unique;
alter table orders add column payment_environment text
  check (payment_environment in ('sandbox','production'));
alter table orders add constraint orders_provider_environment
  check ((mercadopago_order_id is null) = (payment_environment is null));
