import { useEffect, useRef } from 'react';
import { getLastActivity, setLastActivity } from '../storage.js';
import { isExpired } from './idle.js';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
const WRITE_EVERY_MS = 15 * 1000;
const CHECK_EVERY_MS = 15 * 1000;

/**
 * Calls onTimeout once after timeoutMs without activity. Also fires immediately on mount
 * if the stored last activity is already too old (a tab reopened after a break).
 * @param {{ timeoutMs: number, onTimeout: () => void, enabled?: boolean }} opts
 */
export function useIdleTimeout({ timeoutMs, onTimeout, enabled = true }) {
  const fired = useRef(false);
  const lastWrite = useRef(0);
  const cb = useRef(onTimeout);
  useEffect(() => {
    cb.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    if (!enabled) return undefined;
    fired.current = false;

    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      cb.current();
    };
    const check = () => {
      if (isExpired(getLastActivity(), Date.now(), timeoutMs)) fire();
    };
    const touch = () => {
      if (fired.current) return;
      const now = Date.now();
      if (isExpired(getLastActivity(), now, timeoutMs)) return fire();
      if (now - lastWrite.current >= WRITE_EVERY_MS) {
        lastWrite.current = now;
        setLastActivity(now);
      }
      return undefined;
    };

    check();
    if (!fired.current && getLastActivity() == null) setLastActivity(Date.now());
    const timer = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, timeoutMs]);
}
