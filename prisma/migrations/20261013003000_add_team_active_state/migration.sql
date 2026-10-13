-- Additive lifecycle flag. Existing teams remain active; relationships and history stay intact.
ALTER TABLE "teams" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
