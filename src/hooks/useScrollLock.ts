import { useEffect } from "react";

export function useScrollLock(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;

    // Save the original value
    const originalStyle = window.getComputedStyle(document.body).overflow;

    // Prevent scrolling
    document.body.style.overflow = "hidden";

    // Restore on unmount or when lock becomes false
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [lock]);
}
