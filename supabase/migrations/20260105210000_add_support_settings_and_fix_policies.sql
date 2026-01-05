-- Migration to add support settings and fix user_roles infinite recursion

-- ============================================
-- FIX: user_roles infinite recursion
-- ============================================

-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create SECURITY DEFINER function to check admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id
    AND role = 'admin'
  );
$$;

-- Policy: users can view their own roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Policy: admins can manage all roles (uses function that bypasses RLS)
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin((SELECT auth.uid())));

-- ============================================
-- ADD: Support page settings
-- ============================================

INSERT INTO public.app_settings (key, value, description)
VALUES
  ('support_title', 'Suporte', 'Titulo da pagina de suporte'),
  ('support_description', 'Precisa de ajuda? Preencha o formulario abaixo e nossa equipe entrara em contato o mais breve possivel.', 'Descricao exibida na pagina de suporte'),
  ('support_form_script', '', 'Script HTML do formulario Zoho Desk'),
  ('support_success_title', 'Chamado Enviado com Sucesso!', 'Titulo da pagina de sucesso apos envio'),
  ('support_success_message', 'Obrigado por entrar em contato. Nossa equipe recebeu sua mensagem e responderemos o mais breve possivel. Voce recebera uma resposta no email informado.', 'Mensagem de sucesso apos envio do formulario')
ON CONFLICT (key) DO NOTHING;
