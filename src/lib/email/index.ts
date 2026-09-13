export { TRANSACTIONAL_EVENTS, type TransactionalEventType } from "./types";
export { sendTransactionalEmail } from "./service";
export { resolveEmailProvider, sendViaProvider, emailFromAddress, emailReplyToAddress } from "./provider";
export { renderTransactionalTemplate, orderStatusToEvent } from "./templates";
export { EMAIL_EVENT_REGISTRY } from "./registry";
export {
  sendUserRegistered,
  sendEmailVerification,
  sendPasswordReset,
  sendOrderStatusEmail,
  sendPaymentFailed,
  sendOrderRefunded,
  sendPartnerApplicationReceived,
  sendPartnerApproved,
  sendRestaurantPayoutSummary,
  sendCriticalPaymentOrWebhookError,
} from "./events";
