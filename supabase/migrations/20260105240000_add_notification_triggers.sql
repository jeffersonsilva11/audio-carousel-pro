-- Migration: Add automatic notification triggers
-- Description: Creates triggers and functions for automatic notifications

-- ============================================
-- HELPER FUNCTION: Create notification
-- ============================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title_pt TEXT,
  p_message_pt TEXT,
  p_title_en TEXT DEFAULT NULL,
  p_message_en TEXT DEFAULT NULL,
  p_title_es TEXT DEFAULT NULL,
  p_message_es TEXT DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title_pt,
    message_pt,
    title_en,
    message_en,
    title_es,
    message_es,
    action_url
  ) VALUES (
    p_user_id,
    p_type,
    p_title_pt,
    p_message_pt,
    COALESCE(p_title_en, p_title_pt),
    COALESCE(p_message_en, p_message_pt),
    COALESCE(p_title_es, p_title_pt),
    COALESCE(p_message_es, p_message_pt),
    p_action_url
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ============================================
-- 1. WELCOME NOTIFICATION (new user)
-- ============================================
CREATE OR REPLACE FUNCTION notify_welcome_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Wait a bit for profile to be fully created
  PERFORM create_notification(
    NEW.user_id,
    'info',
    '🎉 Bem-vindo ao Audisell!',
    'Estamos felizes em ter você aqui! Crie seu primeiro carrossel e transforme seus áudios em conteúdo visual incrível.',
    '🎉 Welcome to Audisell!',
    'We''re happy to have you here! Create your first carousel and transform your audio into amazing visual content.',
    '🎉 ¡Bienvenido a Audisell!',
    'Estamos felices de tenerte aquí! Crea tu primer carrusel y transforma tus audios en contenido visual increíble.',
    '/create'
  );

  RETURN NEW;
END;
$$;

-- Trigger on profiles insert (happens after user creation)
DROP TRIGGER IF EXISTS trigger_welcome_notification ON profiles;
CREATE TRIGGER trigger_welcome_notification
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_welcome_user();

-- ============================================
-- 2. CAROUSEL CREATED NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_carousel_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify when status changes to COMPLETED
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    PERFORM create_notification(
      NEW.user_id,
      'carousel_ready',
      '✨ Seu carrossel está pronto!',
      'Clique para visualizar e baixar seu carrossel.',
      '✨ Your carousel is ready!',
      'Click to view and download your carousel.',
      '✨ ¡Tu carrusel está listo!',
      'Haz clic para ver y descargar tu carrusel.',
      '/carousel/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_carousel_completed ON carousels;
CREATE TRIGGER trigger_carousel_completed
  AFTER UPDATE ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION notify_carousel_completed();

-- Also trigger on insert if created directly as completed
CREATE OR REPLACE FUNCTION notify_carousel_created_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'COMPLETED' THEN
    PERFORM create_notification(
      NEW.user_id,
      'carousel_ready',
      '✨ Seu carrossel está pronto!',
      'Clique para visualizar e baixar seu carrossel.',
      '✨ Your carousel is ready!',
      'Click to view and download your carousel.',
      '✨ ¡Tu carrusel está listo!',
      'Haz clic para ver y descargar tu carrusel.',
      '/carousel/' || NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_carousel_insert_completed ON carousels;
CREATE TRIGGER trigger_carousel_insert_completed
  AFTER INSERT ON carousels
  FOR EACH ROW
  EXECUTE FUNCTION notify_carousel_created_completed();

-- ============================================
-- 3. PLAN UPGRADE NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_plan_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name TEXT;
BEGIN
  -- Only on insert (new subscription) or plan tier change
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.plan_tier != NEW.plan_tier) THEN
    -- Get plan name
    SELECT name_pt INTO v_plan_name
    FROM plans_config
    WHERE tier = NEW.plan_tier
    LIMIT 1;

    v_plan_name := COALESCE(v_plan_name, NEW.plan_tier);

    IF NEW.plan_tier != 'free' THEN
      PERFORM create_notification(
        NEW.user_id,
        'success',
        '🚀 Upgrade realizado com sucesso!',
        'Parabéns! Agora você tem acesso ao plano ' || v_plan_name || '. Aproveite todos os recursos!',
        '🚀 Upgrade successful!',
        'Congratulations! You now have access to the ' || v_plan_name || ' plan. Enjoy all the features!',
        '🚀 ¡Upgrade realizado con éxito!',
        '¡Felicidades! Ahora tienes acceso al plan ' || v_plan_name || '. ¡Disfruta de todos los recursos!',
        '/dashboard'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_plan_upgrade ON subscriptions;
CREATE TRIGGER trigger_plan_upgrade
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_plan_upgrade();

-- ============================================
-- 4. PAYMENT SUCCESS NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only for successful payment events
  IF NEW.event_type IN ('invoice.paid', 'invoice.payment_succeeded') THEN
    -- Get user_id from subscriptions table using stripe_customer_id
    SELECT user_id INTO v_user_id
    FROM subscriptions
    WHERE stripe_customer_id = NEW.stripe_customer_id
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_user_id,
        'success',
        '💳 Pagamento confirmado!',
        'Obrigado! Seu pagamento foi processado com sucesso.',
        '💳 Payment confirmed!',
        'Thank you! Your payment was successfully processed.',
        '💳 ¡Pago confirmado!',
        '¡Gracias! Tu pago fue procesado exitosamente.',
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payment_success ON stripe_events;
CREATE TRIGGER trigger_payment_success
  AFTER INSERT ON stripe_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_success();

-- ============================================
-- 5. PAYMENT FAILED NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_payment_failed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Only for failed payment events
  IF NEW.event_type IN ('invoice.payment_failed', 'charge.failed') THEN
    SELECT user_id INTO v_user_id
    FROM subscriptions
    WHERE stripe_customer_id = NEW.stripe_customer_id
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
      PERFORM create_notification(
        v_user_id,
        'warning',
        '⚠️ Falha no pagamento',
        'Não conseguimos processar seu pagamento. Por favor, verifique seu método de pagamento.',
        '⚠️ Payment failed',
        'We couldn''t process your payment. Please check your payment method.',
        '⚠️ Fallo en el pago',
        'No pudimos procesar tu pago. Por favor, verifica tu método de pago.',
        '/dashboard'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payment_failed ON stripe_events;
CREATE TRIGGER trigger_payment_failed
  AFTER INSERT ON stripe_events
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_failed();

-- ============================================
-- 6. SUBSCRIPTION CANCELLED NOTIFICATION
-- ============================================
CREATE OR REPLACE FUNCTION notify_subscription_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When cancel_at_period_end changes to true
  IF NEW.cancel_at_period_end = true AND (OLD.cancel_at_period_end IS NULL OR OLD.cancel_at_period_end = false) THEN
    PERFORM create_notification(
      NEW.user_id,
      'info',
      '📋 Assinatura cancelada',
      'Sua assinatura foi cancelada. Você ainda pode usar o plano até ' || TO_CHAR(NEW.current_period_end, 'DD/MM/YYYY') || '.',
      '📋 Subscription cancelled',
      'Your subscription has been cancelled. You can still use the plan until ' || TO_CHAR(NEW.current_period_end, 'MM/DD/YYYY') || '.',
      '📋 Suscripción cancelada',
      'Tu suscripción ha sido cancelada. Aún puedes usar el plan hasta ' || TO_CHAR(NEW.current_period_end, 'DD/MM/YYYY') || '.',
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_subscription_cancelled ON subscriptions;
CREATE TRIGGER trigger_subscription_cancelled
  AFTER UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_subscription_cancelled();

-- ============================================
-- 7. LIMIT WARNING NOTIFICATION (80% used)
-- ============================================
CREATE OR REPLACE FUNCTION notify_limit_warning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_limit INT;
  v_limit_period TEXT;
  v_usage_count INT;
  v_threshold INT;
  v_period_text_pt TEXT;
  v_period_text_en TEXT;
  v_period_text_es TEXT;
BEGIN
  -- Get user's plan limit
  SELECT pc.daily_limit, pc.limit_period
  INTO v_daily_limit, v_limit_period
  FROM subscriptions s
  JOIN plans_config pc ON pc.tier = s.plan_tier
  WHERE s.user_id = NEW.user_id
  LIMIT 1;

  -- Default to free plan if not found
  IF v_daily_limit IS NULL THEN
    v_daily_limit := 1;
    v_limit_period := 'daily';
  END IF;

  -- Calculate 80% threshold
  v_threshold := GREATEST(1, FLOOR(v_daily_limit * 0.8));

  -- Get period text
  CASE v_limit_period
    WHEN 'weekly' THEN
      v_period_text_pt := 'esta semana';
      v_period_text_en := 'this week';
      v_period_text_es := 'esta semana';
    WHEN 'monthly' THEN
      v_period_text_pt := 'este mês';
      v_period_text_en := 'this month';
      v_period_text_es := 'este mes';
    ELSE
      v_period_text_pt := 'hoje';
      v_period_text_en := 'today';
      v_period_text_es := 'hoy';
  END CASE;

  -- Only notify when reaching exactly the threshold (to avoid duplicates)
  IF NEW.carousels_created = v_threshold AND v_daily_limit > 1 THEN
    PERFORM create_notification(
      NEW.user_id,
      'warning',
      '⏰ Limite quase atingido',
      'Você já usou ' || NEW.carousels_created || ' de ' || v_daily_limit || ' carrosséis ' || v_period_text_pt || '.',
      '⏰ Limit almost reached',
      'You have used ' || NEW.carousels_created || ' of ' || v_daily_limit || ' carousels ' || v_period_text_en || '.',
      '⏰ Límite casi alcanzado',
      'Has usado ' || NEW.carousels_created || ' de ' || v_daily_limit || ' carruseles ' || v_period_text_es || '.',
      '/dashboard'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_limit_warning ON daily_usage;
CREATE TRIGGER trigger_limit_warning
  AFTER INSERT OR UPDATE ON daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION notify_limit_warning();

-- ============================================
-- 8. FUNCTION: Check expiring subscriptions
-- (Called by cron job daily)
-- ============================================
CREATE OR REPLACE FUNCTION check_expiring_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_sub RECORD;
  v_days_remaining INT;
BEGIN
  -- Find subscriptions expiring in 1, 3, or 7 days
  FOR v_sub IN
    SELECT
      s.user_id,
      s.current_period_end,
      s.plan_tier,
      s.cancel_at_period_end,
      DATE(s.current_period_end) - CURRENT_DATE as days_until_expiry
    FROM subscriptions s
    WHERE s.status IN ('active', 'past_due')
      AND s.current_period_end IS NOT NULL
      AND DATE(s.current_period_end) - CURRENT_DATE IN (1, 3, 7)
      AND s.cancel_at_period_end = true -- Only for cancelled subscriptions
  LOOP
    v_days_remaining := v_sub.days_until_expiry;

    -- Check if notification was already sent today for this user/days combination
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = v_sub.user_id
        AND type = 'warning'
        AND title_pt LIKE '%Plano expira%'
        AND DATE(created_at) = CURRENT_DATE
    ) THEN
      IF v_days_remaining = 1 THEN
        PERFORM create_notification(
          v_sub.user_id,
          'warning',
          '⚠️ Plano expira amanhã!',
          'Seu plano expira amanhã. Renove agora para não perder acesso aos recursos premium.',
          '⚠️ Plan expires tomorrow!',
          'Your plan expires tomorrow. Renew now to keep access to premium features.',
          '⚠️ ¡El plan expira mañana!',
          'Tu plan expira mañana. Renueva ahora para no perder acceso a los recursos premium.',
          '/dashboard'
        );
      ELSIF v_days_remaining = 3 THEN
        PERFORM create_notification(
          v_sub.user_id,
          'info',
          '📅 Plano expira em 3 dias',
          'Seu plano expira em 3 dias. Considere renovar para continuar aproveitando os recursos.',
          '📅 Plan expires in 3 days',
          'Your plan expires in 3 days. Consider renewing to keep enjoying the features.',
          '📅 El plan expira en 3 días',
          'Tu plan expira en 3 días. Considera renovar para seguir disfrutando los recursos.',
          '/dashboard'
        );
      ELSIF v_days_remaining = 7 THEN
        PERFORM create_notification(
          v_sub.user_id,
          'info',
          '📆 Plano expira em 7 dias',
          'Seu plano expira em uma semana. Lembre-se de renovar se quiser continuar.',
          '📆 Plan expires in 7 days',
          'Your plan expires in a week. Remember to renew if you want to continue.',
          '📆 El plan expira en 7 días',
          'Tu plan expira en una semana. Recuerda renovar si quieres continuar.',
          '/dashboard'
        );
      END IF;

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ============================================
-- 9. Manual subscription notification
-- ============================================
CREATE OR REPLACE FUNCTION notify_manual_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_name TEXT;
  v_expires_text_pt TEXT;
  v_expires_text_en TEXT;
  v_expires_text_es TEXT;
BEGIN
  -- Get plan name
  SELECT name_pt INTO v_plan_name
  FROM plans_config
  WHERE tier = NEW.plan_tier
  LIMIT 1;

  v_plan_name := COALESCE(v_plan_name, NEW.plan_tier);

  -- Format expiry text
  IF NEW.expires_at IS NOT NULL THEN
    v_expires_text_pt := ' até ' || TO_CHAR(NEW.expires_at, 'DD/MM/YYYY');
    v_expires_text_en := ' until ' || TO_CHAR(NEW.expires_at, 'MM/DD/YYYY');
    v_expires_text_es := ' hasta ' || TO_CHAR(NEW.expires_at, 'DD/MM/YYYY');
  ELSE
    v_expires_text_pt := ' permanentemente';
    v_expires_text_en := ' permanently';
    v_expires_text_es := ' permanentemente';
  END IF;

  PERFORM create_notification(
    NEW.user_id,
    'success',
    '🎁 Você recebeu um plano!',
    'Parabéns! Você recebeu acesso ao plano ' || v_plan_name || v_expires_text_pt || '.',
    '🎁 You received a plan!',
    'Congratulations! You received access to the ' || v_plan_name || ' plan' || v_expires_text_en || '.',
    '🎁 ¡Recibiste un plan!',
    '¡Felicidades! Recibiste acceso al plan ' || v_plan_name || v_expires_text_es || '.',
    '/dashboard'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_manual_subscription ON manual_subscriptions;
CREATE TRIGGER trigger_manual_subscription
  AFTER INSERT ON manual_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_manual_subscription();

-- ============================================
-- CRON JOB: Check expiring subscriptions daily
-- ============================================
-- Note: This requires pg_cron extension. Run this manually if pg_cron is available:
-- SELECT cron.schedule('check-expiring-subscriptions', '0 9 * * *', $$SELECT check_expiring_subscriptions()$$);
--
-- Alternatively, call check_expiring_subscriptions() from an edge function scheduled in Supabase dashboard

-- Try to schedule if pg_cron is available
DO $$
BEGIN
  -- Check if cron schema exists
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('check-expiring-subscriptions');
    -- Schedule new job
    PERFORM cron.schedule(
      'check-expiring-subscriptions',
      '0 9 * * *',
      'SELECT check_expiring_subscriptions()'
    );
    RAISE NOTICE 'Cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron not available. Use edge function for scheduled notifications.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Use edge function instead.', SQLERRM;
END;
$$;
