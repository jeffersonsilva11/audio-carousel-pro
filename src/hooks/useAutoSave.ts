import { useState, useCallback, useEffect, useRef } from "react";

interface AutoSaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Hook for auto-saving data with debounce and visual feedback
 * @param data - The data to auto-save
 * @param onSave - Callback function to save the data
 * @param options - Configuration options
 */
export function useAutoSave<T>(
  data: T,
  onSave: (data: T) => void | Promise<void>,
  options: AutoSaveOptions = {}
) {
  const { debounceMs = 3000, enabled = true } = options;
  
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const isSavingRef = useRef(false);
  const pendingDataRef = useRef<T | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
    };
  }, []);

  const save = useCallback(async (dataToSave: T) => {
    const serialized = JSON.stringify(dataToSave);
    
    // Skip if data hasn't changed
    if (serialized === lastSavedRef.current) {
      return;
    }

    // If already saving, queue this save
    if (isSavingRef.current) {
      pendingDataRef.current = dataToSave;
      return;
    }

    isSavingRef.current = true;
    setSaveStatus("saving");
    
    try {
      await onSave(dataToSave);
      lastSavedRef.current = serialized;
      setSaveStatus("saved");
      
      // Reset to idle after showing "saved" for 2 seconds
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
      
    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus("error");
      
      // Reset to idle after showing error for 3 seconds
      if (savedIndicatorTimeoutRef.current) {
        clearTimeout(savedIndicatorTimeoutRef.current);
      }
      savedIndicatorTimeoutRef.current = setTimeout(() => {
        setSaveStatus("idle");
      }, 3000);
    } finally {
      isSavingRef.current = false;
      
      // Process pending save if any
      if (pendingDataRef.current !== null) {
        const pending = pendingDataRef.current;
        pendingDataRef.current = null;
        save(pending);
      }
    }
  }, [onSave]);

  // Effect to trigger debounced save
  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    const serialized = JSON.stringify(data);
    if (serialized === lastSavedRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, save, debounceMs, enabled]);

  // Force save immediately
  const saveNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save(data);
  }, [data, save]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(data) !== lastSavedRef.current;
  }, [data]);

  return {
    saveNow,
    hasUnsavedChanges,
    saveStatus,
    isSaving: saveStatus === "saving",
  };
}
