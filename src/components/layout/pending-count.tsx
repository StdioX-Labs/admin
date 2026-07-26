'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { eventsApi } from '@/lib/api';

const PendingCountContext = createContext(0);

/**
 * One fetch of the ONHOLD event count, shared by the sidebar badge, the
 * bottom tab bar and the More sheet. `size=1` because only totalElements
 * is read.
 */
export function PendingCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    eventsApi
      .getAllEvents(0, 1, undefined, 'ONHOLD')
      .then((res) => {
        if (!cancelled && res.status) setCount(res.data?.totalElements ?? 0);
      })
      .catch(() => {
        /* badge stays at 0 — never block the shell on this */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <PendingCountContext.Provider value={count}>{children}</PendingCountContext.Provider>;
}

export function usePendingCount() {
  return useContext(PendingCountContext);
}
