import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentQueryError, QueryState } from './query.types';

export interface UseAsyncQueryOptions<T> {
  queryKey: string;
  initialData: T;
  queryFn: (signal: AbortSignal) => Promise<T>;
}

function normalizeContentQueryError(error: unknown): ContentQueryError {
  if (error instanceof Error) {
    return {
      message: error.message,
      cause: error,
    };
  }

  return {
    message: 'حدث خطأ غير متوقع أثناء تحميل البيانات.',
    cause: error,
  };
}

export function useAsyncQuery<T>({
  queryKey,
  initialData,
  queryFn,
}: UseAsyncQueryOptions<T>): QueryState<T> {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ContentQueryError | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestVersionRef = useRef(0);

  const reload = useCallback(() => {
    setReloadVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestVersion = ++requestVersionRef.current;
    let isMounted = true;

    queueMicrotask(() => {
      if (!isMounted) return;
      if (requestVersion !== requestVersionRef.current) return;

      setData(initialData);
      setIsLoading(true);
      setError(null);
    });

    // قد لا تُستدعى queryFn إطلاقًا إذا أُلغي الطلب قبل هذه النقطة،
    // مثل unmount فوري. هذا مقصود وآمن لدوال القراءة الخالصة الحالية.
    Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return queryFn(controller.signal);
      })
      .then(
        (nextData) => {
          if (!isMounted) return;
          if (requestVersion !== requestVersionRef.current) return;

          setData(nextData);
          setIsLoading(false);
          setError(null);
        },
        (queryError: unknown) => {
          if (controller.signal.aborted) return;
          if (!isMounted) return;
          if (requestVersion !== requestVersionRef.current) return;

          setData(initialData);
          setIsLoading(false);
          setError(normalizeContentQueryError(queryError));
        },
      );

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [initialData, queryFn, queryKey, reloadVersion]);

  return {
    data,
    isLoading,
    error,
    reload,
  };
}
