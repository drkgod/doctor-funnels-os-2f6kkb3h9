CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_value text, secret_key text)
 RETURNS text
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT pgp_sym_decrypt(dearmor(encrypted_value), secret_key);
$function$;
