-- Add created_by_trainer field to routines table
ALTER TABLE routines 
ADD COLUMN created_by_trainer UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX idx_routines_created_by_trainer ON routines(created_by_trainer);

-- Add comment
COMMENT ON COLUMN routines.created_by_trainer IS 'ID of the trainer who assigned this routine to the client. NULL if created by the client themselves.';
