import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  campaignId?: string;
  tags?: { name: string; value: string }[];
}

export async function sendEmail(options: SendEmailOptions) {
  const { to, from, fromName, replyTo, subject, html, text, campaignId, tags } =
    options;

  const fromAddress = `${fromName} <${from}>`;

  const response = await resend.emails.send({
    from: fromAddress,
    to: [to],
    replyTo: replyTo,
    subject,
    html,
    text,
    headers: campaignId
      ? {
          "X-Campaign-ID": campaignId,
        }
      : undefined,
    tags,
  });

  return response;
}

export async function sendBatchEmails(
  emails: Array<{
    to: string;
    from: string;
    fromName: string;
    replyTo?: string;
    subject: string;
    html: string;
    text?: string;
  }>
) {
  const batch = emails.map((email) => ({
    from: `${email.fromName} <${email.from}>`,
    to: [email.to],
    replyTo: email.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }));

  const response = await resend.batch.send(batch);
  return response;
}

// Verify domain status
export async function getDomainStatus(domainId: string) {
  const response = await resend.domains.get(domainId);
  return response;
}

// List all domains
export async function listDomains() {
  const response = await resend.domains.list();
  return response;
}
