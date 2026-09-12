import { useCallback, useEffect, useState } from 'react';
import type { Product } from '../types/inventory';
import {
  getProducts,
  saveProduct,
  deleteProduct,
  adjustStock,
  getProductById,
  seedDemoData,
} from '../store/inventoryStore';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const list = await getProducts();
      setProducts(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await seedDemoData();
      } catch {
        // ignore seed errors
      }
      await refresh();
    })();
  }, [refresh]);

  const createOrUpdate = useCallback(
    async (
      data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ) => {
      const saved = await saveProduct(data);
      await refresh();
      return saved;
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteProduct(id);
      await refresh();
    },
    [refresh]
  );

  const changeStock = useCallback(
    async (productId: string, change: number, reason?: string) => {
      const updated = await adjustStock(productId, change, reason);
      await refresh();
      return updated;
    },
    [refresh]
  );

  return {
    products,
    loading,
    error,
    refresh,
    createOrUpdate,
    remove,
    changeStock,
    getById: getProductById,
  };
}

export function useProduct(id: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const p = await getProductById(id);
        setProduct(p ?? null);
      } catch (err: any) {
        setError(err?.message || 'Failed to load product');
        setProduct(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return { product, loading, error };
}
