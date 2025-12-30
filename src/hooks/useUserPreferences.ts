import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { TemplateId, TextModeId, SlideCountMode, AvatarPosition, DisplayMode } from "@/lib/constants";
import { CreativeTone } from "@/components/carousel-creator/TextModeSelector";

export type DateFormatPreference = 'short' | 'medium' | 'long' | 'withTime';
export type TimeFormatPreference = '12h' | '24h';

export interface UserPreferences {
  // Profile identity
  name: string;
  username: string;
  photoUrl: string | null;
  avatarPosition: AvatarPosition;
  displayMode: DisplayMode;
  
  // Date/time preferences
  dateFormat: DateFormatPreference;
  timeFormat: TimeFormatPreference;
  showRelativeTime: boolean;
  
  // Carousel preferences
  defaultTemplate: TemplateId;
  defaultTextMode: TextModeId;
  defaultCreativeTone: CreativeTone;
  defaultSlideCountMode: SlideCountMode;
  defaultManualSlideCount: number;
  defaultTone: string;
  defaultStyle: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  name: "",
  username: "",
  photoUrl: null,
  avatarPosition: "top-left",
  displayMode: "name_and_username",
  dateFormat: "medium",
  timeFormat: "24h",
  showRelativeTime: true,
  defaultTemplate: "solid",
  defaultTextMode: "compact",
  defaultCreativeTone: "professional",
  defaultSlideCountMode: "auto",
  defaultManualSlideCount: 6,
  defaultTone: "PROFESSIONAL",
  defaultStyle: "BLACK_WHITE",
};

export function useUserPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from database
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(DEFAULT_PREFERENCES);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading preferences:", error);
        setLoading(false);
        return;
      }

      if (data) {
        setPreferences({
          name: data.name || user.user_metadata?.full_name || "",
          username: data.instagram_handle || "",
          photoUrl: data.profile_image || user.user_metadata?.avatar_url || null,
          avatarPosition: (data.avatar_position as AvatarPosition) || "top-left",
          displayMode: (data.display_mode as DisplayMode) || "name_and_username",
          dateFormat: (data.date_format as DateFormatPreference) || "medium",
          timeFormat: (data.time_format as TimeFormatPreference) || "24h",
          showRelativeTime: data.show_relative_time ?? true,
          defaultTemplate: (data.default_template as TemplateId) || "solid",
          defaultTextMode: (data.default_text_mode as TextModeId) || "compact",
          defaultCreativeTone: (data.default_creative_tone as CreativeTone) || "professional",
          defaultSlideCountMode: (data.default_slide_count_mode as SlideCountMode) || "auto",
          defaultManualSlideCount: data.default_manual_slide_count || 6,
          defaultTone: data.default_tone || "PROFESSIONAL",
          defaultStyle: data.default_style || "BLACK_WHITE",
        });
      } else {
        // Use user metadata as fallback
        setPreferences({
          ...DEFAULT_PREFERENCES,
          name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          photoUrl: user.user_metadata?.avatar_url || null,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Save preferences to database
  const savePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      
      if (newPreferences.name !== undefined) updateData.name = newPreferences.name;
      if (newPreferences.username !== undefined) updateData.instagram_handle = newPreferences.username;
      if (newPreferences.photoUrl !== undefined) updateData.profile_image = newPreferences.photoUrl;
      if (newPreferences.avatarPosition !== undefined) updateData.avatar_position = newPreferences.avatarPosition;
      if (newPreferences.displayMode !== undefined) updateData.display_mode = newPreferences.displayMode;
      if (newPreferences.dateFormat !== undefined) updateData.date_format = newPreferences.dateFormat;
      if (newPreferences.timeFormat !== undefined) updateData.time_format = newPreferences.timeFormat;
      if (newPreferences.showRelativeTime !== undefined) updateData.show_relative_time = newPreferences.showRelativeTime;
      if (newPreferences.defaultTemplate !== undefined) updateData.default_template = newPreferences.defaultTemplate;
      if (newPreferences.defaultTextMode !== undefined) updateData.default_text_mode = newPreferences.defaultTextMode;
      if (newPreferences.defaultCreativeTone !== undefined) updateData.default_creative_tone = newPreferences.defaultCreativeTone;
      if (newPreferences.defaultSlideCountMode !== undefined) updateData.default_slide_count_mode = newPreferences.defaultSlideCountMode;
      if (newPreferences.defaultManualSlideCount !== undefined) updateData.default_manual_slide_count = newPreferences.defaultManualSlideCount;
      if (newPreferences.defaultTone !== undefined) updateData.default_tone = newPreferences.defaultTone;
      if (newPreferences.defaultStyle !== undefined) updateData.default_style = newPreferences.defaultStyle;

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error saving preferences:", error);
        return;
      }

      setPreferences(prev => ({ ...prev, ...newPreferences }));
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setSaving(false);
    }
  }, [user]);

  return {
    preferences,
    loading,
    saving,
    loadPreferences,
    savePreferences,
  };
}
