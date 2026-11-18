-- Scouting shows "completed" and "failed" from the time a task finished.
alter table public.agent_tasks add column finished_at timestamptz;
