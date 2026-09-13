/** Transactional email event types (marketing is out of scope — see docs/transactional-email.md). */
export const TRANSACTIONAL_EVENTS = [
  "user_registered",
  "email_verification",
  "password_reset",
  "order_created",
  "order_accepted",
  "order_rejected",
  "order_cancelled",
  "order_refunded",
  "payment_failed",
  "order_ready",
  "order_out_for_delivery",
  "order_completed",
  "partner_application_received",
  "partner_approved",
  "restaurant_payout_summary",
  "critical_payment_or_webhook_error",
] as const;

export type TransactionalEventType = (typeof TRANSACTIONAL_EVENTS)[number];

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export type ProviderSendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type ProviderSendResult = {
  ok: boolean;
  mock: boolean;
  channel: string;
  messageId?: string;
  error?: string;
};

export type SendTransactionalResult = {
  ok: boolean;
  skipped: boolean;
  mock: boolean;
  channel: string;
  eventKey: string;
  error?: string;
};

export type EmailLocale = "de" | "en" | "tr";
