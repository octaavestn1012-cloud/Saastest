import { useEffect } from "react";

export function useScrollLock(lock: boolean = true) {
  useEffect(() => {
    if (!lock) return;

    // Save original styles
    const originalBodyOverflow = document.body.style.overflow;
    const containers = document.querySelectorAll<HTMLElement>("[data-app-scroll-container]");
    const originalContainerStyles: Map<HTMLElement, string> = new Map();

    containers.forEach((container) => {
      originalContainerStyles.set(container, container.style.overflow);
      container.style.overflow = "hidden";
      container.style.touchAction = "none";
    });

    document.body.style.overflow = "hidden";
    document.body.classList.add("scroll-locked");

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.classList.remove("scroll-locked");
      containers.forEach((container) => {
        const orig = originalContainerStyles.get(container);
        if (orig !== undefined) {
          container.style.overflow = orig;
          container.style.touchAction = "";
        }
      });
    };
  }, [lock]);
}

