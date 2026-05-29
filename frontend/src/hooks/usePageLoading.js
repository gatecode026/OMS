import { useState, useEffect } from 'react';

export const usePageLoading = (delay = 600) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return loading;
};

export default usePageLoading;
