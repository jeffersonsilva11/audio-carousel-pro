import { useLanguage } from "@/hooks/useLanguage";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/constants";

const TermsOfService = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const content = {
    "pt-BR": {
      title: "Termos de Uso",
      lastUpdated: "Última atualização: 31 de dezembro de 2024",
      sections: [
        {
          title: "1. Aceitação dos Termos",
          content: `Ao acessar e usar o ${BRAND.name}, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.`
        },
        {
          title: "2. Descrição do Serviço",
          content: `O ${BRAND.name} é uma plataforma SaaS que transforma áudios em carrosséis profissionais para redes sociais usando inteligência artificial. O serviço inclui transcrição de áudio, geração de roteiros e criação de imagens para carrosséis.`
        },
        {
          title: "3. Conta do Usuário",
          content: "Para usar nossos serviços, você deve criar uma conta fornecendo informações precisas e completas. Você é responsável por manter a confidencialidade de sua conta e senha, e por restringir o acesso ao seu computador. Você concorda em aceitar a responsabilidade por todas as atividades que ocorram em sua conta."
        },
        {
          title: "4. Uso Aceitável",
          content: "Você concorda em não usar o serviço para: (a) violar qualquer lei local, estadual, nacional ou internacional; (b) transmitir conteúdo ilegal, difamatório, obsceno ou ofensivo; (c) enviar spam ou mensagens não solicitadas; (d) interferir ou interromper o serviço ou servidores; (e) tentar obter acesso não autorizado a sistemas ou redes."
        },
        {
          title: "5. Propriedade Intelectual",
          content: `O conteúdo gerado através do ${BRAND.name} a partir do seu áudio pertence a você. No entanto, todo o software, design, texto e outros materiais do serviço são de propriedade do ${BRAND.name} e estão protegidos por leis de propriedade intelectual.`
        },
        {
          title: "6. Pagamentos e Assinaturas",
          content: "Alguns recursos do serviço requerem pagamento. Ao assinar um plano pago, você concorda em pagar todas as taxas aplicáveis. As assinaturas são renovadas automaticamente até o cancelamento. Você pode cancelar sua assinatura a qualquer momento através das configurações da conta."
        },
        {
          title: "7. Política de Reembolso",
          content: "Oferecemos um período de teste gratuito. Após a contratação de um plano pago, não oferecemos reembolsos, exceto em casos de falha técnica comprovada de nossa parte ou conforme exigido por lei."
        },
        {
          title: "8. Limitação de Responsabilidade",
          content: `O ${BRAND.name} é fornecido "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, seguro ou livre de erros. Em nenhum caso seremos responsáveis por danos indiretos, incidentais, especiais ou consequenciais.`
        },
        {
          title: "9. Modificações dos Termos",
          content: "Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor imediatamente após a publicação. O uso continuado do serviço após alterações constitui aceitação dos novos termos."
        },
        {
          title: "10. Lei Aplicável",
          content: "Estes Termos serão regidos e interpretados de acordo com as leis do Brasil, sem considerar conflitos de disposições legais."
        },
        {
          title: "11. Contato",
          content: "Para questões sobre estes Termos de Uso, entre em contato conosco através do email: suporte@audisell.com"
        }
      ]
    },
    en: {
      title: "Terms of Service",
      lastUpdated: "Last updated: December 31, 2024",
      sections: [
        {
          title: "1. Acceptance of Terms",
          content: `By accessing and using ${BRAND.name}, you agree to comply with and be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.`
        },
        {
          title: "2. Service Description",
          content: `${BRAND.name} is a SaaS platform that transforms audio into professional carousels for social media using artificial intelligence. The service includes audio transcription, script generation, and carousel image creation.`
        },
        {
          title: "3. User Account",
          content: "To use our services, you must create an account by providing accurate and complete information. You are responsible for maintaining the confidentiality of your account and password, and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account."
        },
        {
          title: "4. Acceptable Use",
          content: "You agree not to use the service to: (a) violate any local, state, national, or international law; (b) transmit illegal, defamatory, obscene, or offensive content; (c) send spam or unsolicited messages; (d) interfere with or disrupt the service or servers; (e) attempt to gain unauthorized access to systems or networks."
        },
        {
          title: "5. Intellectual Property",
          content: `Content generated through ${BRAND.name} from your audio belongs to you. However, all software, design, text, and other materials of the service are owned by ${BRAND.name} and are protected by intellectual property laws.`
        },
        {
          title: "6. Payments and Subscriptions",
          content: "Some features of the service require payment. By subscribing to a paid plan, you agree to pay all applicable fees. Subscriptions are automatically renewed until canceled. You can cancel your subscription at any time through account settings."
        },
        {
          title: "7. Refund Policy",
          content: "We offer a free trial period. After subscribing to a paid plan, we do not offer refunds, except in cases of proven technical failure on our part or as required by law."
        },
        {
          title: "8. Limitation of Liability",
          content: `${BRAND.name} is provided "as is" and "as available". We do not guarantee that the service will be uninterrupted, secure, or error-free. In no event shall we be liable for indirect, incidental, special, or consequential damages.`
        },
        {
          title: "9. Modifications to Terms",
          content: "We reserve the right to modify these terms at any time. Changes will take effect immediately upon publication. Continued use of the service after changes constitutes acceptance of the new terms."
        },
        {
          title: "10. Governing Law",
          content: "These Terms shall be governed and construed in accordance with the laws of Brazil, without regard to conflict of law provisions."
        },
        {
          title: "11. Contact",
          content: "For questions about these Terms of Service, contact us at: support@audisell.com"
        }
      ]
    },
    es: {
      title: "Términos de Uso",
      lastUpdated: "Última actualización: 31 de diciembre de 2024",
      sections: [
        {
          title: "1. Aceptación de los Términos",
          content: `Al acceder y usar ${BRAND.name}, usted acepta cumplir y estar sujeto a estos Términos de Uso. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al servicio.`
        },
        {
          title: "2. Descripción del Servicio",
          content: `${BRAND.name} es una plataforma SaaS que transforma audio en carruseles profesionales para redes sociales utilizando inteligencia artificial. El servicio incluye transcripción de audio, generación de guiones y creación de imágenes para carruseles.`
        },
        {
          title: "3. Cuenta de Usuario",
          content: "Para usar nuestros servicios, debe crear una cuenta proporcionando información precisa y completa. Usted es responsable de mantener la confidencialidad de su cuenta y contraseña, y de restringir el acceso a su computadora. Usted acepta aceptar la responsabilidad de todas las actividades que ocurran bajo su cuenta."
        },
        {
          title: "4. Uso Aceptable",
          content: "Usted acepta no usar el servicio para: (a) violar cualquier ley local, estatal, nacional o internacional; (b) transmitir contenido ilegal, difamatorio, obsceno u ofensivo; (c) enviar spam o mensajes no solicitados; (d) interferir o interrumpir el servicio o servidores; (e) intentar obtener acceso no autorizado a sistemas o redes."
        },
        {
          title: "5. Propiedad Intelectual",
          content: `El contenido generado a través de ${BRAND.name} a partir de su audio le pertenece. Sin embargo, todo el software, diseño, texto y otros materiales del servicio son propiedad de ${BRAND.name} y están protegidos por leyes de propiedad intelectual.`
        },
        {
          title: "6. Pagos y Suscripciones",
          content: "Algunas funciones del servicio requieren pago. Al suscribirse a un plan pago, usted acepta pagar todas las tarifas aplicables. Las suscripciones se renuevan automáticamente hasta su cancelación. Puede cancelar su suscripción en cualquier momento a través de la configuración de la cuenta."
        },
        {
          title: "7. Política de Reembolso",
          content: "Ofrecemos un período de prueba gratuito. Después de contratar un plan pago, no ofrecemos reembolsos, excepto en casos de falla técnica comprobada de nuestra parte o según lo exija la ley."
        },
        {
          title: "8. Limitación de Responsabilidad",
          content: `${BRAND.name} se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio sea ininterrumpido, seguro o libre de errores. En ningún caso seremos responsables por daños indirectos, incidentales, especiales o consecuentes.`
        },
        {
          title: "9. Modificaciones de los Términos",
          content: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán en vigor inmediatamente después de la publicación. El uso continuado del servicio después de los cambios constituye la aceptación de los nuevos términos."
        },
        {
          title: "10. Ley Aplicable",
          content: "Estos Términos se regirán e interpretarán de acuerdo con las leyes de Brasil, sin tener en cuenta las disposiciones sobre conflictos de leyes."
        },
        {
          title: "11. Contacto",
          content: "Para preguntas sobre estos Términos de Uso, contáctenos en: soporte@audisell.com"
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
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t("nav", "goBack", language) || "Voltar"}>
                <ArrowLeft className="w-5 h-5" aria-hidden="true" />
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

export default TermsOfService;
