import { useState, useEffect } from 'react';

export const usePageLoading = (delay = 600) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Cap artificial delay at 50ms for snappy transitions and instant page rendering
    const SnappyDelay = 50;
    const timer = setTimeout(() => {
      setLoading(false);
    }, SnappyDelay);
    return () => clearTimeout(timer);
  }, []);

  return loading;
};

export default usePageLoading;
