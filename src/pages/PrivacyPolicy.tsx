import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/constants";

const PrivacyPolicy = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const content = {
    "pt-BR": {
      title: "Política de Privacidade",
      lastUpdated: "Última atualização: 31 de dezembro de 2024",
      sections: [
        {
          title: "1. Introdução",
          content: `O ${BRAND.name} ("nós", "nosso" ou "nos") está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você usa nosso serviço, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).`
        },
        {
          title: "2. Dados que Coletamos",
          content: "Coletamos os seguintes tipos de dados: (a) Dados de identificação: nome, email, foto de perfil; (b) Dados de uso: áudios enviados, carrosséis gerados, preferências de configuração; (c) Dados de pagamento: processados de forma segura pelo Stripe, não armazenamos dados de cartão; (d) Dados técnicos: endereço IP, tipo de navegador, dispositivo utilizado, logs de acesso."
        },
        {
          title: "3. Base Legal e Finalidade",
          content: "Processamos seus dados com base em: (a) Execução de contrato: para fornecer nossos serviços; (b) Consentimento: para comunicações de marketing; (c) Interesse legítimo: para melhorar nossos serviços e prevenir fraudes; (d) Obrigação legal: para cumprimento de exigências regulatórias."
        },
        {
          title: "4. Uso dos Dados",
          content: "Utilizamos seus dados para: (a) Fornecer e manter nosso serviço; (b) Processar transações e pagamentos; (c) Enviar notificações sobre sua conta; (d) Melhorar e personalizar a experiência do usuário; (e) Responder a solicitações de suporte; (f) Detectar e prevenir fraudes ou abusos."
        },
        {
          title: "5. Compartilhamento de Dados",
          content: "Compartilhamos dados apenas com: (a) Stripe: para processamento de pagamentos; (b) OpenAI: para transcrição de áudio (dados são processados e não armazenados); (c) Google: para geração de conteúdo via IA; (d) Provedores de infraestrutura: para hospedagem e armazenamento seguro. Não vendemos seus dados pessoais."
        },
        {
          title: "6. Retenção de Dados",
          content: "Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer serviços. Dados de áudio são processados e podem ser excluídos após a geração do carrossel. Você pode solicitar a exclusão de sua conta e dados a qualquer momento."
        },
        {
          title: "7. Seus Direitos (LGPD)",
          content: "Conforme a LGPD, você tem direito a: (a) Confirmar o tratamento de dados; (b) Acessar seus dados; (c) Corrigir dados incompletos ou desatualizados; (d) Anonimizar, bloquear ou eliminar dados desnecessários; (e) Portabilidade dos dados; (f) Revogar consentimento; (g) Ser informado sobre compartilhamento de dados."
        },
        {
          title: "8. Exercício dos Direitos",
          content: "Para exercer seus direitos, acesse a página de Configurações da sua conta ou envie um email para privacidade@carrosselai.com. Responderemos em até 15 dias úteis. Você também pode exportar todos os seus dados diretamente nas configurações do perfil."
        },
        {
          title: "9. Segurança dos Dados",
          content: "Implementamos medidas de segurança técnicas e organizacionais, incluindo: criptografia em trânsito e em repouso, controle de acesso, monitoramento de segurança, backups regulares e políticas de segurança para funcionários."
        },
        {
          title: "10. Cookies e Tecnologias Similares",
          content: "Utilizamos cookies para: (a) Manter sua sessão ativa; (b) Lembrar preferências; (c) Analisar uso do serviço; (d) Personalizar conteúdo. Você pode gerenciar cookies através das configurações do seu navegador."
        },
        {
          title: "11. Transferência Internacional",
          content: "Seus dados podem ser processados em servidores localizados fora do Brasil. Garantimos que essas transferências cumprem os requisitos da LGPD através de cláusulas contratuais padrão e outras salvaguardas apropriadas."
        },
        {
          title: "12. Menores de Idade",
          content: "Nosso serviço não é destinado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se tomarmos conhecimento de que coletamos dados de um menor, excluiremos essas informações."
        },
        {
          title: "13. Alterações na Política",
          content: "Podemos atualizar esta política periodicamente. Notificaremos sobre alterações significativas por email ou através de aviso no serviço. O uso continuado após alterações constitui aceitação da política atualizada."
        },
        {
          title: "14. Encarregado de Dados (DPO)",
          content: "Para questões relacionadas à proteção de dados, entre em contato com nosso Encarregado de Dados através do email: dpo@carrosselai.com"
        },
        {
          title: "15. Contato",
          content: "Para dúvidas sobre esta Política de Privacidade: Email: privacidade@carrosselai.com"
        }
      ]
    },
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: December 31, 2024",
      sections: [
        {
          title: "1. Introduction",
          content: `${BRAND.name} ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our service, in compliance with the Brazilian General Data Protection Law (LGPD - Law No. 13,709/2018) and GDPR.`
        },
        {
          title: "2. Data We Collect",
          content: "We collect the following types of data: (a) Identification data: name, email, profile picture; (b) Usage data: uploaded audios, generated carousels, configuration preferences; (c) Payment data: securely processed by Stripe, we do not store card data; (d) Technical data: IP address, browser type, device used, access logs."
        },
        {
          title: "3. Legal Basis and Purpose",
          content: "We process your data based on: (a) Contract execution: to provide our services; (b) Consent: for marketing communications; (c) Legitimate interest: to improve our services and prevent fraud; (d) Legal obligation: to comply with regulatory requirements."
        },
        {
          title: "4. Use of Data",
          content: "We use your data to: (a) Provide and maintain our service; (b) Process transactions and payments; (c) Send notifications about your account; (d) Improve and personalize user experience; (e) Respond to support requests; (f) Detect and prevent fraud or abuse."
        },
        {
          title: "5. Data Sharing",
          content: "We share data only with: (a) Stripe: for payment processing; (b) OpenAI: for audio transcription (data is processed and not stored); (c) Google: for AI content generation; (d) Infrastructure providers: for secure hosting and storage. We do not sell your personal data."
        },
        {
          title: "6. Data Retention",
          content: "We retain your data while your account is active or as needed to provide services. Audio data is processed and may be deleted after carousel generation. You can request deletion of your account and data at any time."
        },
        {
          title: "7. Your Rights",
          content: "Under LGPD and GDPR, you have the right to: (a) Confirm data processing; (b) Access your data; (c) Correct incomplete or outdated data; (d) Anonymize, block, or delete unnecessary data; (e) Data portability; (f) Revoke consent; (g) Be informed about data sharing."
        },
        {
          title: "8. Exercising Your Rights",
          content: "To exercise your rights, access the Settings page of your account or send an email to privacy@carrosselai.com. We will respond within 15 business days. You can also export all your data directly in profile settings."
        },
        {
          title: "9. Data Security",
          content: "We implement technical and organizational security measures, including: encryption in transit and at rest, access control, security monitoring, regular backups, and security policies for employees."
        },
        {
          title: "10. Cookies and Similar Technologies",
          content: "We use cookies to: (a) Keep your session active; (b) Remember preferences; (c) Analyze service usage; (d) Personalize content. You can manage cookies through your browser settings."
        },
        {
          title: "11. International Transfer",
          content: "Your data may be processed on servers located outside Brazil. We ensure these transfers comply with LGPD requirements through standard contractual clauses and other appropriate safeguards."
        },
        {
          title: "12. Minors",
          content: "Our service is not intended for those under 18 years of age. We do not intentionally collect data from minors. If we become aware that we have collected data from a minor, we will delete that information."
        },
        {
          title: "13. Policy Changes",
          content: "We may update this policy periodically. We will notify you of significant changes by email or through a notice on the service. Continued use after changes constitutes acceptance of the updated policy."
        },
        {
          title: "14. Data Protection Officer",
          content: "For data protection questions, contact our Data Protection Officer at: dpo@carrosselai.com"
        },
        {
          title: "15. Contact",
          content: "For questions about this Privacy Policy: Email: privacy@carrosselai.com"
        }
      ]
    },
    es: {
      title: "Política de Privacidad",
      lastUpdated: "Última actualización: 31 de diciembre de 2024",
      sections: [
        {
          title: "1. Introducción",
          content: `${BRAND.name} ("nosotros", "nuestro" o "nos") está comprometido a proteger su privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestro servicio, en cumplimiento con la Ley General de Protección de Datos de Brasil (LGPD).`
        },
        {
          title: "2. Datos que Recopilamos",
          content: "Recopilamos los siguientes tipos de datos: (a) Datos de identificación: nombre, correo electrónico, foto de perfil; (b) Datos de uso: audios cargados, carruseles generados, preferencias de configuración; (c) Datos de pago: procesados de forma segura por Stripe, no almacenamos datos de tarjeta; (d) Datos técnicos: dirección IP, tipo de navegador, dispositivo utilizado, registros de acceso."
        },
        {
          title: "3. Base Legal y Propósito",
          content: "Procesamos sus datos basándonos en: (a) Ejecución del contrato: para proporcionar nuestros servicios; (b) Consentimiento: para comunicaciones de marketing; (c) Interés legítimo: para mejorar nuestros servicios y prevenir fraudes; (d) Obligación legal: para cumplir con requisitos regulatorios."
        },
        {
          title: "4. Uso de los Datos",
          content: "Utilizamos sus datos para: (a) Proporcionar y mantener nuestro servicio; (b) Procesar transacciones y pagos; (c) Enviar notificaciones sobre su cuenta; (d) Mejorar y personalizar la experiencia del usuario; (e) Responder a solicitudes de soporte; (f) Detectar y prevenir fraudes o abusos."
        },
        {
          title: "5. Compartir Datos",
          content: "Compartimos datos solo con: (a) Stripe: para procesamiento de pagos; (b) OpenAI: para transcripción de audio (datos procesados y no almacenados); (c) Google: para generación de contenido con IA; (d) Proveedores de infraestructura: para alojamiento y almacenamiento seguro. No vendemos sus datos personales."
        },
        {
          title: "6. Retención de Datos",
          content: "Mantenemos sus datos mientras su cuenta esté activa o según sea necesario para proporcionar servicios. Los datos de audio se procesan y pueden eliminarse después de la generación del carrusel. Puede solicitar la eliminación de su cuenta y datos en cualquier momento."
        },
        {
          title: "7. Sus Derechos",
          content: "Según la LGPD, tiene derecho a: (a) Confirmar el tratamiento de datos; (b) Acceder a sus datos; (c) Corregir datos incompletos o desactualizados; (d) Anonimizar, bloquear o eliminar datos innecesarios; (e) Portabilidad de datos; (f) Revocar consentimiento; (g) Ser informado sobre el intercambio de datos."
        },
        {
          title: "8. Ejercicio de sus Derechos",
          content: "Para ejercer sus derechos, acceda a la página de Configuración de su cuenta o envíe un correo a privacidad@carrosselai.com. Responderemos en un plazo de 15 días hábiles. También puede exportar todos sus datos directamente en la configuración del perfil."
        },
        {
          title: "9. Seguridad de los Datos",
          content: "Implementamos medidas de seguridad técnicas y organizativas, que incluyen: cifrado en tránsito y en reposo, control de acceso, monitoreo de seguridad, copias de seguridad regulares y políticas de seguridad para empleados."
        },
        {
          title: "10. Cookies y Tecnologías Similares",
          content: "Utilizamos cookies para: (a) Mantener su sesión activa; (b) Recordar preferencias; (c) Analizar el uso del servicio; (d) Personalizar contenido. Puede gestionar las cookies a través de la configuración de su navegador."
        },
        {
          title: "11. Transferencia Internacional",
          content: "Sus datos pueden procesarse en servidores ubicados fuera de Brasil. Garantizamos que estas transferencias cumplen con los requisitos de la LGPD a través de cláusulas contractuales estándar y otras salvaguardas apropiadas."
        },
        {
          title: "12. Menores de Edad",
          content: "Nuestro servicio no está destinado a menores de 18 años. No recopilamos intencionalmente datos de menores. Si nos enteramos de que hemos recopilado datos de un menor, eliminaremos esa información."
        },
        {
          title: "13. Cambios en la Política",
          content: "Podemos actualizar esta política periódicamente. Le notificaremos sobre cambios significativos por correo electrónico o mediante un aviso en el servicio. El uso continuado después de los cambios constituye la aceptación de la política actualizada."
        },
        {
          title: "14. Oficial de Protección de Datos",
          content: "Para preguntas relacionadas con la protección de datos, contacte a nuestro Oficial de Protección de Datos en: dpo@carrosselai.com"
        },
        {
          title: "15. Contacto",
          content: "Para preguntas sobre esta Política de Privacidad: Correo: privacidad@carrosselai.com"
        }
      ]
    }
  };

  const currentContent = content[language] || content["pt-BR"];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <a href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Mic2 className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight">{BRAND.name}</span>
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{currentContent.title}</h1>
        <p className="text-muted-foreground mb-8">{currentContent.lastUpdated}</p>

        <div className="space-y-8">
          {currentContent.sections.map((section, index) => (
            <section key={index}>
              <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
