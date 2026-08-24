import { useEffect, useState } from 'react';

export function useDelayedLoading(isLoading, delay = 300) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShow(false);
      return undefined;
    }

    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return show;
}
