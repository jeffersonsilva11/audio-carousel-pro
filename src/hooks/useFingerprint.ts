import { useCallback, useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface FingerprintData {
  visitorId: string;
  confidence: number;
}

export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<FingerprintData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        
        setFingerprint({
          visitorId: result.visitorId,
          confidence: result.confidence.score,
        });
      } catch (error) {
        console.error('Fingerprint loading failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFingerprint();
  }, []);

  const getFingerprint = useCallback(async (): Promise<string | null> => {
    if (fingerprint) {
      return fingerprint.visitorId;
    }

    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      return result.visitorId;
    } catch {
      return null;
    }
  }, [fingerprint]);

  return {
    fingerprint,
    isLoading,
    getFingerprint,
  };
}
