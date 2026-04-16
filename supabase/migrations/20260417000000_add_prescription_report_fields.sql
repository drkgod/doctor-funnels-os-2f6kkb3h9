DO $$
BEGIN
  -- Prescriptions table fields
  ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS valid_until DATE;
  ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
  ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS notes TEXT;

  -- Medical reports table fields
  ALTER TABLE public.medical_reports ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
  ALTER TABLE public.medical_reports ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
END $$;
