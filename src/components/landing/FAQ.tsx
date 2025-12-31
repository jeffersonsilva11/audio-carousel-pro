import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage, SupportedLanguage } from "@/hooks/useLanguage";
import { t } from "@/lib/translations";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface FAQ {
  id: string;
  question_pt: string;
  question_en: string | null;
  question_es: string | null;
  answer_pt: string;
  answer_en: string | null;
  answer_es: string | null;
  display_order: number;
}

const FAQ = () => {
  const { language } = useLanguage();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestion = (faq: FAQ, lang: SupportedLanguage): string => {
    if (lang === "pt-BR") return faq.question_pt;
    if (lang === "en") return faq.question_en || faq.question_pt;
    return faq.question_es || faq.question_pt;
  };

  const getAnswer = (faq: FAQ, lang: SupportedLanguage): string => {
    if (lang === "pt-BR") return faq.answer_pt;
    if (lang === "en") return faq.answer_en || faq.answer_pt;
    return faq.answer_es || faq.answer_pt;
  };

  return (
    <section id="faq" className="py-24 md:py-32">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-sm font-semibold text-accent mb-4 tracking-wide uppercase"
          >
            {t("faq", "sectionTitle", language)}
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-display-sm md:text-display-md mb-4"
          >
            {t("faq", "title", language)}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-body-lg text-muted-foreground"
          >
            {t("faq", "subtitle", language)}
          </motion.p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem
                    value={faq.id}
                    className="bg-card border border-border rounded-2xl px-6 data-[state=open]:shadow-lg transition-shadow"
                  >
                    <AccordionTrigger className="text-left font-semibold py-6 hover:no-underline">
                      {getQuestion(faq, language)}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6">
                      {getAnswer(faq, language)}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
