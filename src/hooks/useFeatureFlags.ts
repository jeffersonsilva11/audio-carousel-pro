import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [allFlags, setAllFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("name");

      if (error) throw error;

      const flagMap: Record<string, boolean> = {};
      (data || []).forEach((flag: FeatureFlag) => {
        flagMap[flag.key] = flag.enabled;
      });

      setFlags(flagMap);
      setAllFlags(data || []);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
    } finally {
      setLoading(false);
    }
  };

  const isEnabled = (key: string): boolean => {
    return flags[key] ?? true; // Default to enabled if flag doesn't exist
  };

  const toggleFlag = async (key: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled })
        .eq("key", key);

      if (error) throw error;

      setFlags((prev) => ({ ...prev, [key]: enabled }));
      setAllFlags((prev) =>
        prev.map((f) => (f.key === key ? { ...f, enabled } : f))
      );

      return true;
    } catch (error) {
      console.error("Error toggling feature flag:", error);
      return false;
    }
  };

  return { flags, allFlags, loading, isEnabled, toggleFlag, refetch: fetchFlags };
}
