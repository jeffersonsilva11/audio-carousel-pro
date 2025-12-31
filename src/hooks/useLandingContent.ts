import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SupportedLanguage } from "./useLanguage";

interface LandingContentItem {
  section_key: string;
  content_key: string;
  value_pt: string;
  value_en: string | null;
  value_es: string | null;
}

type ContentMap = Record<string, Record<string, string>>;

export function useLandingContent() {
  const [content, setContent] = useState<ContentMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from("landing_content")
        .select("section_key, content_key, value_pt, value_en, value_es");

      if (error) throw error;

      // Transform array to nested object
      const contentMap: ContentMap = {};
      (data || []).forEach((item: LandingContentItem) => {
        if (!contentMap[item.section_key]) {
          contentMap[item.section_key] = {};
        }
        // Store all language values
        contentMap[item.section_key][`${item.content_key}_pt`] = item.value_pt;
        contentMap[item.section_key][`${item.content_key}_en`] = item.value_en || item.value_pt;
        contentMap[item.section_key][`${item.content_key}_es`] = item.value_es || item.value_pt;
      });

      setContent(contentMap);
    } catch (error) {
      console.error("Error fetching landing content:", error);
    } finally {
      setLoading(false);
    }
  };

  const getContent = (section: string, key: string, language: SupportedLanguage): string => {
    const langSuffix = language === "pt-BR" ? "pt" : language === "en" ? "en" : "es";
    return content[section]?.[`${key}_${langSuffix}`] || content[section]?.[`${key}_pt`] || "";
  };

  return { content, loading, getContent, refetch: fetchContent };
}
