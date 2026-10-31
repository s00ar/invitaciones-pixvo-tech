-- Precios ARS aprobados por el titular. Importes en centavos.
-- Aplicación única mediante pixvo_migrations; no altera órdenes/snapshots previos.
update public.plans
set name = case id
      when 'standard' then 'Invitación básica'
      when 'premium' then 'Invitación interactiva'
      when 'custom' then 'Invitación premium'
    end,
    price_minor = case id
      when 'standard' then 3500000
      when 'premium' then 6000000
      when 'custom' then 10000000
    end,
    entitlements = case
      when id = 'standard' then jsonb_set(entitlements, '{audio}', 'true'::jsonb)
      else entitlements
    end
where id in ('standard', 'premium', 'custom');
