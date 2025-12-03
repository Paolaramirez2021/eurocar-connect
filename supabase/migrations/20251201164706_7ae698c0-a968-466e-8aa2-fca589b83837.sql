-- Add completed field to maintenance table to track if maintenance has been reviewed/archived
ALTER TABLE maintenance ADD COLUMN completed BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX idx_maintenance_completed ON maintenance(completed);