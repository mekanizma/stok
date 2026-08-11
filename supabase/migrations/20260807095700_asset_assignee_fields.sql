/*
# Free-form assignee fields on assets (no user account required for zimmet)
*/

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS assignee_name text;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS assignee_email text;
