import { useCallback, useEffect, useRef } from "react";

interface AutoSaveOptions {
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook for auto-saving data with debounce
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
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>(JSON.stringify(data));
  const isSavingRef = useRef(false);
  const pendingDataRef = useRef<T | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
    
    try {
      await onSave(dataToSave);
      lastSavedRef.current = serialized;
    } catch (error) {
      console.error("Auto-save error:", error);
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
    isSaving: isSavingRef.current,
  };
}
