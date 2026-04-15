CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.encrypt_api_key(key_value text, secret_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT armor(pgp_sym_encrypt(key_value, secret_key));
$function$;
