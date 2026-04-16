DO $$
BEGIN
  -- Delete duplicates keeping the most recent
  DELETE FROM public.tenant_api_keys a
  USING (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY tenant_id, provider ORDER BY created_at DESC) as rnum
    FROM public.tenant_api_keys
  ) b
  WHERE a.id = b.id AND b.rnum > 1;

  -- Add the unique constraint
  IF NOT EXISTS (
      SELECT 1 
      FROM pg_constraint 
      WHERE conname = 'unique_tenant_provider'
  ) THEN
      ALTER TABLE public.tenant_api_keys ADD CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider);
  END IF;
END $$;
