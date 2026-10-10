-- Expand the existing owner-only draft table to two additional real Python exercises.
-- Existing RLS and authenticated grants remain unchanged.
alter table public.python_practice_drafts
  drop constraint if exists python_practice_drafts_lesson_id_check;

alter table public.python_practice_drafts
  add constraint python_practice_drafts_lesson_id_check
  check (lesson_id in ('P0-U1-L02','P0-U1-L03','P0-U1-L04','P0-U1-L05'));
