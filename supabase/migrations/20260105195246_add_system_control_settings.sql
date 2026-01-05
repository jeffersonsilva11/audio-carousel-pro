-- Add system control settings for admin panel

-- Registration control
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'registration_disabled',
  'false',
  'Quando true, desabilita o cadastro de novos usuários'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'registration_disabled_message',
  'Estamos temporariamente com as inscrições fechadas. Por favor, tente novamente mais tarde.',
  'Mensagem exibida quando cadastro está desabilitado'
)
ON CONFLICT (key) DO NOTHING;

-- Maintenance mode
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'maintenance_mode',
  'false',
  'Quando true, exibe página de manutenção para todos os usuários (exceto admins)'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'maintenance_message',
  'Estamos realizando uma manutenção programada para melhorar sua experiência. Voltaremos em breve!',
  'Mensagem exibida na página de manutenção'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'maintenance_end_time',
  '',
  'Data/hora prevista para fim da manutenção (ISO 8601). Deixe vazio para não exibir contador.'
)
ON CONFLICT (key) DO NOTHING;

-- App version control (for new version notification)
INSERT INTO public.app_settings (key, value, description)
VALUES (
  'app_version',
  '1.0.0',
  'Versão atual do app. Quando alterada, usuários com versão antiga verão notificação para atualizar.'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'version_update_message',
  'Uma nova versão do Audisell está disponível! Clique para atualizar e ter acesso às últimas melhorias.',
  'Mensagem exibida quando há nova versão disponível'
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES (
  'version_notification_enabled',
  'true',
  'Quando true, exibe notificação de nova versão para usuários'
)
ON CONFLICT (key) DO NOTHING;
