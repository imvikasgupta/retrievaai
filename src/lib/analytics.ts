declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const measurementId = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
  | string
  | undefined;

let initialized = false;

export function gtag(...args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function initAnalytics() {
  if (typeof window === "undefined" || initialized || !measurementId) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", measurementId, { send_page_view: true });
}

export function trackPageView(path: string) {
  if (!measurementId) return;
  gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}

/** CTA click that should convert into an assistant session. */
export function trackCtaClick(ctaId: string, label: string, location: string) {
  if (!measurementId) {
    if (import.meta.env.DEV) console.info("[analytics] cta_click", { ctaId, label, location });
    return;
  }
  gtag("event", "cta_click", {
    cta_id: ctaId,
    cta_label: label,
    cta_location: location,
    page_path: window.location.pathname,
  });
}
