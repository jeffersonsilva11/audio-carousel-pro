import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Quanto tempo leva para gerar um carrossel?",
    answer: "Em média, menos de 30 segundos! O processo inclui transcrição do áudio, roteirização com IA e geração das 6 imagens. Você acompanha cada etapa em tempo real.",
  },
  {
    question: "Quais formatos de áudio são aceitos?",
    answer: "Aceitamos MP3, WAV e M4A com até 60 segundos de duração e máximo de 10MB. Você pode gravar diretamente na plataforma ou fazer upload de um arquivo.",
  },
  {
    question: "Posso usar as imagens comercialmente?",
    answer: "Sim! Todos os carrosséis gerados com a assinatura Pro são livres de marca d'água e podem ser usados comercialmente em suas redes sociais sem restrições.",
  },
  {
    question: "O que são os 'tons de voz'?",
    answer: "São diferentes estilos de roteirização baseados em frameworks de copywriting. O Emocional usa storytelling para conexão, o Profissional é educacional com dados, e o Provocador é direto e controverso.",
  },
  {
    question: "Posso cancelar a assinatura a qualquer momento?",
    answer: "Sim! Você pode cancelar quando quiser pelo painel. O acesso continua até o fim do período pago e não há taxas de cancelamento.",
  },
  {
    question: "Os carrosséis ficam salvos?",
    answer: "Sim! Assinantes Pro têm acesso ao histórico completo de todos os carrosséis gerados. Você pode baixar novamente quando precisar.",
  },
  {
    question: "Funciona em português?",
    answer: "Sim! A plataforma detecta automaticamente o idioma do áudio (português, inglês ou espanhol) e gera o carrossel no mesmo idioma.",
  },
  {
    question: "Como funciona a amostra grátis?",
    answer: "Você pode gerar 1 carrossel de teste sem pagar nada. Ele vem com uma pequena marca d'água do Carrossel AI. É perfeito para testar a qualidade antes de assinar.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            Dúvidas frequentes
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            Perguntas comuns
          </h2>
          <p className="text-body-lg text-muted-foreground">
            Não encontrou sua resposta? Entre em contato pelo suporte.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-2xl px-6 data-[state=open]:shadow-lg transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold py-6 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
