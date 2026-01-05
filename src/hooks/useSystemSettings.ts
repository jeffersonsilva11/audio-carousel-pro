import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemSettings {
  // Registration control
  registrationDisabled: boolean;
  registrationDisabledMessage: string;

  // Maintenance mode
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string | null;

  // Version control
  appVersion: string;
  versionUpdateMessage: string;
  versionNotificationEnabled: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  registrationDisabled: false,
  registrationDisabledMessage: "Estamos temporariamente com as inscrições fechadas. Por favor, tente novamente mais tarde.",
  maintenanceMode: false,
  maintenanceMessage: "Estamos realizando uma manutenção programada para melhorar sua experiência. Voltaremos em breve!",
  maintenanceEndTime: null,
  appVersion: "1.0.0",
  versionUpdateMessage: "Uma nova versão do Audisell está disponível! Clique para atualizar e ter acesso às últimas melhorias.",
  versionNotificationEnabled: true,
};

// Map database keys to settings object keys
const KEY_MAP: Record<string, keyof SystemSettings> = {
  'registration_disabled': 'registrationDisabled',
  'registration_disabled_message': 'registrationDisabledMessage',
  'maintenance_mode': 'maintenanceMode',
  'maintenance_message': 'maintenanceMessage',
  'maintenance_end_time': 'maintenanceEndTime',
  'app_version': 'appVersion',
  'version_update_message': 'versionUpdateMessage',
  'version_notification_enabled': 'versionNotificationEnabled',
};

// Parse value from database (handles booleans stored as strings)
function parseValue(key: string, value: string | null): boolean | string | null {
  if (value === null || value === '') return null;

  // Boolean fields
  if (['registration_disabled', 'maintenance_mode', 'version_notification_enabled'].includes(key)) {
    return value === 'true';
  }

  return value;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", Object.keys(KEY_MAP));

      if (fetchError) throw fetchError;

      if (data) {
        const newSettings = { ...DEFAULT_SETTINGS };

        data.forEach((row) => {
          const settingKey = KEY_MAP[row.key];
          if (settingKey) {
            const parsedValue = parseValue(row.key, row.value);
            if (parsedValue !== null) {
              (newSettings as Record<string, unknown>)[settingKey] = parsedValue;
            }
          }
        });

        setSettings(newSettings);
      }
    } catch (err) {
      console.error("Error fetching system settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback(async (key: string, value: string) => {
    try {
      const { error: updateError } = await supabase
        .from("app_settings")
        .update({ value })
        .eq("key", key);

      if (updateError) throw updateError;

      // Refresh settings
      await fetchSettings();
      return true;
    } catch (err) {
      console.error("Error updating setting:", err);
      return false;
    }
  }, [fetchSettings]);

  // Update multiple settings at once
  const updateSettings = useCallback(async (updates: Record<string, string>) => {
    try {
      const promises = Object.entries(updates).map(([key, value]) =>
        supabase.from("app_settings").update({ value }).eq("key", key)
      );

      await Promise.all(promises);
      await fetchSettings();
      return true;
    } catch (err) {
      console.error("Error updating settings:", err);
      return false;
    }
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel("app_settings_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "app_settings",
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateSettings,
    refetch: fetchSettings,
  };
}

// Standalone function to check settings without hook (for use in loaders)
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", Object.keys(KEY_MAP));

    if (error) throw error;

    const settings = { ...DEFAULT_SETTINGS };

    if (data) {
      data.forEach((row) => {
        const settingKey = KEY_MAP[row.key];
        if (settingKey) {
          const parsedValue = parseValue(row.key, row.value);
          if (parsedValue !== null) {
            (settings as Record<string, unknown>)[settingKey] = parsedValue;
          }
        }
      });
    }

    return settings;
  } catch (err) {
    console.error("Error fetching system settings:", err);
    return DEFAULT_SETTINGS;
  }
}
