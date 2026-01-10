import { useState, useCallback, useEffect } from 'react';
import { useFingerprint } from './useFingerprint';
import { supabase } from '@/integrations/supabase/client';

const MAX_FAILED_ATTEMPTS = 3;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in ms
const STORAGE_KEY = 'auth_attempts';

// Check if running in development mode using Vite's environment variable
// This is safe because import.meta.env.DEV is replaced at build time (false in production)
const isDevelopment = import.meta.env.DEV;

interface AttemptData {
  count: number;
  lastAttempt: number;
  fingerprint: string;
}

export function useAuthProtection() {
  const { getFingerprint, isLoading: fingerprintLoading } = useFingerprint();
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  // Load stored attempts on mount
  useEffect(() => {
    const loadStoredAttempts = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data: AttemptData = JSON.parse(stored);
          const now = Date.now();
          
          // Check if lockout has expired
          if (data.lastAttempt + LOCKOUT_DURATION > now) {
            setFailedAttempts(data.count);

            if (data.count >= MAX_FAILED_ATTEMPTS) {
              setIsLocked(true);
              setLockoutEndTime(data.lastAttempt + LOCKOUT_DURATION);
            }
          } else {
            // Lockout expired, clear storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // Ignore storage errors
      }
    };

    loadStoredAttempts();
  }, []);

  // Update lockout status
  useEffect(() => {
    if (lockoutEndTime) {
      const interval = setInterval(() => {
        if (Date.now() >= lockoutEndTime) {
          setIsLocked(false);
          setLockoutEndTime(null);
          setFailedAttempts(0);
          localStorage.removeItem(STORAGE_KEY);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lockoutEndTime]);

  const recordFailedAttempt = useCallback(async () => {
    const fingerprint = await getFingerprint();
    const newCount = failedAttempts + 1;
    
    const attemptData: AttemptData = {
      count: newCount,
      lastAttempt: Date.now(),
      fingerprint: fingerprint || 'unknown',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(attemptData));
    setFailedAttempts(newCount);

    if (newCount >= MAX_FAILED_ATTEMPTS) {
      setIsLocked(true);
      setLockoutEndTime(Date.now() + LOCKOUT_DURATION);
    }

    // Log to backend for analytics
    try {
      await supabase.functions.invoke('log-auth-attempt', {
        body: {
          fingerprint,
          success: false,
          attemptCount: newCount,
        },
      });
    } catch {
      // Ignore logging errors
    }
  }, [failedAttempts, getFingerprint]);

  const recordSuccessfulAttempt = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY);
    setFailedAttempts(0);
    setIsLocked(false);
    setLockoutEndTime(null);

    const fingerprint = await getFingerprint();
    
    try {
      await supabase.functions.invoke('log-auth-attempt', {
        body: {
          fingerprint,
          success: true,
          attemptCount: 0,
        },
      });
    } catch {
      // Ignore logging errors
    }
  }, [getFingerprint]);

  const getRemainingLockoutTime = useCallback(() => {
    if (!lockoutEndTime) return 0;
    const remaining = lockoutEndTime - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000));
  }, [lockoutEndTime]);

  return {
    failedAttempts,
    isLocked: isDevelopment ? false : isLocked,
    recordFailedAttempt,
    recordSuccessfulAttempt,
    getRemainingLockoutTime,
    isLoading: fingerprintLoading,
  };
}
