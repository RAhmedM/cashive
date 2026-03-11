"use client";

/**
 * useApi — Generic data-fetching hook with loading, error, and refetch support.
 *
 * Uses the typed `api` client from `@/lib/api` so session credentials are sent
 * automatically. Returns BeeLoader-compatible `loading` state.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi<{ offers: Offer[] }>("/api/offers/featured");
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(path: string | null): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);
  // Track the current path to avoid stale responses
  const pathRef = useRef(path);
  pathRef.current = path;

  const fetchData = useCallback(async () => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.get<T>(path);
      // Only update if the path hasn't changed since we started
      if (pathRef.current === path) {
        setData(result);
      }
    } catch (err) {
      if (pathRef.current === path) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred");
        }
      }
    } finally {
      if (pathRef.current === path) {
        setLoading(false);
      }
    }
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * useMutate — Wrapper for POST/PATCH/DELETE actions with loading + error state.
 *
 * Usage:
 *   const { mutate, loading, error } = useMutate();
 *   await mutate(() => api.post("/api/promo/redeem", { code }));
 */
interface UseMutateResult {
  mutate: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
  loading: boolean;
  error: string | null;
}

export function useMutate(): UseMutateResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      return result;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
