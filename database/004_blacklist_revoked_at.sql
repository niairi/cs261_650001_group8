-- Track manual blacklist releases without deleting the original suspension record.
ALTER TABLE blacklist
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP;
