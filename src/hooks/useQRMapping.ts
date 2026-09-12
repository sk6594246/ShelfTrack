import { useCallback, useEffect, useState } from 'react';
import type { QRMappingConfig } from '../types/inventory';
import { getQRMapping, saveQRMapping } from '../store/inventoryStore';
import { DEFAULT_QR_MAPPING } from '../types/inventory';

export function useQRMapping() {
  const [config, setConfig] = useState<QRMappingConfig>(DEFAULT_QR_MAPPING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const c = await getQRMapping();
        setConfig(c);
      } catch (err: any) {
        setError(err?.message || 'Failed to load QR mapping');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = useCallback(async (next: QRMappingConfig) => {
    await saveQRMapping(next);
    setConfig(next);
  }, []);

  return { config, loading, error, update };
}
