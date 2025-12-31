import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";

const FAQ = () => {
  const { language } = useLanguage();

  const faqs = [
    { q: t("faq", "q1", language), a: t("faq", "a1", language) },
    { q: t("faq", "q2", language), a: t("faq", "a2", language) },
    { q: t("faq", "q9", language), a: t("faq", "a9", language) },
    { q: t("faq", "q3", language), a: t("faq", "a3", language) },
    { q: t("faq", "q4", language), a: t("faq", "a4", language) },
    { q: t("faq", "q10", language), a: t("faq", "a10", language) },
    { q: t("faq", "q5", language), a: t("faq", "a5", language) },
    { q: t("faq", "q6", language), a: t("faq", "a6", language) },
    { q: t("faq", "q8", language), a: t("faq", "a8", language) },
  ];

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase">
            {t("faq", "sectionTitle", language)}
          </span>
          <h2 className="text-display-sm md:text-display-md mb-4">
            {t("faq", "title", language)}
          </h2>
          <p className="text-body-lg text-muted-foreground">
            {t("faq", "subtitle", language)}
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
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.a}
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
