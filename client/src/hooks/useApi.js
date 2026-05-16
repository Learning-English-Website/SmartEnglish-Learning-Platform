import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * useApi - custom hook for API calls with loading/error states
 * 
 * @param {Function} apiCall - async function to call
 * @param {Object} options - { loadingMessage, successMessage, errorMessage }
 * @returns {Object} { execute, isLoading, error, data }
 */
export function useApi(apiCall, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);

    let loadingToast;
    if (options.loadingMessage) {
      loadingToast = toast.loading(options.loadingMessage);
    }

    try {
      const result = await apiCall(...args);
      setData(result);

      if (options.successMessage) {
        toast.success(options.successMessage, { id: loadingToast });
      }

      return result;
    } catch (err) {
      setError(err);
      const message = options.errorMessage || err?.response?.data?.message || err.message || 'Something went wrong';
      toast.error(message, { id: loadingToast });
      throw err;
    } finally {
      setIsLoading(false);
      if (loadingToast) {
        // Toast will auto-dismiss based on duration
      }
    }
  }, [apiCall, options]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, isLoading, error, data, reset };
}

/**
 * useMutation - hook for mutations (create, update, delete)
 */
export function useMutation(apiCall, options = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (variables) => {
    setIsLoading(true);
    setError(null);

    const loadingMsg = options.loadingMessage || 'Processing...';
    const loadingToast = toast.loading(loadingMsg);

    try {
      const result = await apiCall(variables);
      const successMsg = options.successMessage || options.success;
      if (successMsg) {
        toast.success(successMsg, { id: loadingToast });
      }
      return result;
    } catch (err) {
      setError(err);
      const errorMsg = options.errorMessage || options.error || err?.response?.data?.message || err.message || 'Something went wrong';
      toast.error(errorMsg, { id: loadingToast });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, options]);

  return { mutate, isLoading, error };
}

/**
 * useQuery - hook for data fetching with cache support
 * Note: For production, consider using React Query or SWR
 */
export function useQuery(key, fetcher, options = {}) {
  const [data, setData] = useState(options.initialData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  return { data, isLoading, error, refetch };
}

export default useApi;
