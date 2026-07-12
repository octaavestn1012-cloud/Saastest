"use client";

import { useEffect, useRef } from "react";
import { saveUserTimezone } from "@/app/actions/timezone";

export function TimezoneUpdater() {
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        // Send to server in the background
        saveUserTimezone(tz).catch(err => console.error("Failed to save timezone:", err));
      }
    } catch (e) {
      console.error("Could not determine timezone", e);
    }
  }, []);

  return null; // Invisible component
}
