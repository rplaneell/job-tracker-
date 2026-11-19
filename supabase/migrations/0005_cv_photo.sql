-- The owner's CV photo. Stored as a small JPEG data address in the owner only master CV row. The check allows only a real
-- JPEG (no svg, no script, no quotes) and at most 150000 characters. The tailoring tool never reads this column.
alter table public.cv_master add column photo text
  check (photo is null or (photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/=]+$' and octet_length(photo) <= 150000));
