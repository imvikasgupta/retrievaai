import type { RetrievedSource } from "@/lib/rag";

/**
 * Demo Mode content. Used only when the AI service is unavailable so the whole
 * product flow stays testable. Responses are clearly labelled as sample data.
 */

type DemoAnswer = { match: RegExp; answer: string; sources: Omit<RetrievedSource, "chunkId" | "documentId">[] };

const DEMO_ANSWERS: DemoAnswer[] = [
  {
    match: /refund|cancel|money back/i,
    answer:
      "According to NovaTech's **Refund & Cancellation Policy**, eligible customers can request a refund within **14 days** of an initial purchase or a plan upgrade, provided the workspace has not used more than 25% of its monthly message allowance.\n\n- Refunds are returned to the original payment method within 5–10 business days.\n- Subscriptions can be cancelled any time from **Settings → Billing** and remain active until the end of the billing period.",
    sources: [
      {
        documentName: "Refund_and_Cancellation_Policy.pdf",
        fileType: "pdf",
        pageNumber: 1,
        similarity: 0.96,
        content:
          "Refund eligibility: NovaTech offers a full refund within 14 days of an initial purchase or a plan upgrade…",
      },
    ],
  },
  {
    match: /password|reset|sign in|login/i,
    answer:
      "To reset your password, open the sign-in screen and choose **Forgot password**. The reset link stays valid for 60 minutes.\n\nIf you are already signed in, go to **Settings → Security → Change password**. New passwords need at least 12 characters including a number and a symbol, and all other sessions are signed out automatically.",
    sources: [
      {
        documentName: "Account_Security_Guide.docx",
        fileType: "docx",
        pageNumber: 1,
        similarity: 0.94,
        content: "To reset your password, navigate to Settings, Security, then select Change password…",
      },
    ],
  },
  {
    match: /upgrade|plan|pricing|price|cost/i,
    answer:
      "NovaTech offers three plans:\n\n- **Starter** — €29 per seat / month (NovaDesk + basic reporting)\n- **Growth** — €79 per seat / month (adds automation, analytics and API access)\n- **Enterprise** — custom pricing (SSO, audit logs, dedicated success manager)\n\nWorkspace owners can upgrade at any time from **Settings → Billing → Change plan**. Upgrades apply immediately and are charged pro-rata.",
    sources: [
      {
        documentName: "Pricing_Documentation.md",
        fileType: "md",
        pageNumber: 1,
        similarity: 0.93,
        content: "Starter is 29 EUR per seat per month… Growth is 79 EUR per seat per month…",
      },
    ],
  },
  {
    match: /contact|support|hours|agent/i,
    answer:
      "You can reach NovaTech support at **support@novatech.com**, through in-app chat, or by phone on Enterprise plans. Standard hours are **Monday–Friday, 09:00–18:00 CET**, with 24/7 coverage for critical Enterprise incidents.",
    sources: [
      {
        documentName: "NovaTech_Support_FAQ.pdf",
        fileType: "pdf",
        pageNumber: 1,
        similarity: 0.91,
        content: "NovaTech support is reachable at support@novatech.com, through in-app chat, or by phone…",
      },
    ],
  },
  {
    match: /service|product|onboarding|offer/i,
    answer:
      "NovaTech provides a unified customer operations platform made up of **NovaDesk** (omnichannel inbox), **NovaFlow** (workflow automation), **NovaInsight** (analytics) and **NovaConnect** (API & integrations).\n\nOnboarding runs over three weeks: workspace setup and data import, team training and workflow configuration, then integrations and go-live.",
    sources: [
      {
        documentName: "NovaTech_Product_Guide.pdf",
        fileType: "pdf",
        pageNumber: 2,
        similarity: 0.92,
        content: "Core services include NovaDesk, NovaFlow, NovaInsight and NovaConnect…",
      },
    ],
  },
];

export function demoAnswer(question: string): { answer: string; sources: RetrievedSource[]; grounded: boolean } {
  const hit = DEMO_ANSWERS.find((entry) => entry.match.test(question));
  if (!hit) {
    return {
      answer:
        "I couldn't find enough information in the knowledge base to answer this accurately. In Demo Mode I can only answer from the five sample NovaTech documents.",
      sources: [],
      grounded: false,
    };
  }
  return {
    answer: hit.answer,
    grounded: true,
    sources: hit.sources.map((source, i) => ({
      ...source,
      chunkId: `demo-${i}`,
      documentId: `demo-${i}`,
    })),
  };
}
