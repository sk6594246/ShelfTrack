import { useCallback, useEffect, useState } from 'react';
import { getProducts } from '../store/inventoryStore';
import type { Product } from '../types/inventory';

export function useLocations() {
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const products: Product[] = await getProducts();
      // Get unique locations, excluding empty ones
      const uniqueLocations = [
        ...new Set(
          products
            .map((p) => p.location?.trim())
            .filter((loc): loc is string => !!loc && loc.length > 0)
        ),
      ].sort();
      setLocations(uniqueLocations);
    } catch (err: any) {
      setError(err?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { locations, loading, error, refresh };
}