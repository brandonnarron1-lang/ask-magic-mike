-- INFRA-03 read-only contact identity preflight.
--
-- Run before applying the unpublished INFRA-02 lifecycle migration to any
-- non-local database. This query reports historical contacts that would make
-- canonical email/phone backfill ambiguous. It does not modify data.

with normalized_contacts as (
  select
    id,
    created_at,
    nullif(lower(btrim(email)), '') as normalized_email,
    case
      when nullif(regexp_replace(coalesce(phone_normalized, phone, ''), '[^0-9]', '', 'g'), '') is null then null
      when length(regexp_replace(coalesce(phone_normalized, phone, ''), '[^0-9]', '', 'g')) = 11
        and left(regexp_replace(coalesce(phone_normalized, phone, ''), '[^0-9]', '', 'g'), 1) = '1'
        then substring(regexp_replace(coalesce(phone_normalized, phone, ''), '[^0-9]', '', 'g') from 2)
      else regexp_replace(coalesce(phone_normalized, phone, ''), '[^0-9]', '', 'g')
    end as normalized_phone
  from public.contacts
),
email_conflicts as (
  select
    'email' as identity_type,
    normalized_email as normalized_value,
    count(distinct id) as contact_count,
    array_agg(id order by created_at, id) as contact_ids
  from normalized_contacts
  where normalized_email is not null
  group by normalized_email
  having count(distinct id) > 1
),
phone_conflicts as (
  select
    'phone' as identity_type,
    normalized_phone as normalized_value,
    count(distinct id) as contact_count,
    array_agg(id order by created_at, id) as contact_ids
  from normalized_contacts
  where normalized_phone is not null
  group by normalized_phone
  having count(distinct id) > 1
)
select *
from email_conflicts
union all
select *
from phone_conflicts
order by identity_type, normalized_value;
