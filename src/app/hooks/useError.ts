import { useState, useCallback } from "react";

interface UseErrorReturn {
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
  hasError: boolean;
}

export const useError = (initialError: string | null = null): UseErrorReturn => {
  const [error, setError] = useState<string | null>(initialError);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const hasError = error !== null;

  return {
    error,
    setError,
    clearError,
    hasError,
  };
};

export default useError;
