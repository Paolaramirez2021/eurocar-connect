-- ============================================================
-- EUROCAR RENTAL - DATABASE SCHEMA
-- File: 6_seeds.sql
-- Description: Initial seed data (non-sensitive)
-- ============================================================

-- ============================================================
-- 1. DEFAULT SETTINGS
-- ============================================================

INSERT INTO public.settings (key, value) VALUES
    ('reservation_timeout_hours', '24'::jsonb),
    ('reservation_notifications_enabled', 'true'::jsonb),
    ('auto_regenerate_vehicle_status', 'true'::jsonb),
    ('envio_contrato_previo', 'false'::jsonb),
    ('integration_google', '{"enabled": false}'::jsonb),
    ('integration_gpt', '{"enabled": true}'::jsonb),
    ('integration_stripe', '{"enabled": false}'::jsonb),
    ('integration_mercadopago', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 2. AUTH TRIGGER FOR NEW USERS
-- ============================================================

-- Create trigger on auth.users for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 3. EXAMPLE: CREATE FIRST ADMIN USER
-- ============================================================
-- 
-- After a user signs up, run this SQL to grant them socio_principal role:
--
-- INSERT INTO public.user_roles (id, user_id, role, assigned_at)
-- VALUES (
--     gen_random_uuid(),
--     '<USER_UUID_HERE>',  -- Replace with the actual user UUID from auth.users
--     'socio_principal',
--     now()
-- );
--
-- To find the user UUID:
-- SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- ============================================================
-- END OF FILE 6_seeds.sql
-- ============================================================
