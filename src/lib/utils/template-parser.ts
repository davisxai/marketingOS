import type { Lead } from "@/types";
import { nanoid } from "nanoid";

export interface PersonalizedContent {
  subject: string;
  html: string;
  text?: string;
}

export interface TemplateVariables {
  firstName: string;
  lastName: string;
  fullName: string;
  company: string;
  industry: string;
  city: string;
  state: string;
  email: string;
  [key: string]: string;
}

// Build variable map from lead data
export function buildVariables(lead: Lead): TemplateVariables {
  return {
    firstName: lead.first_name || "there",
    lastName: lead.last_name || "",
    fullName:
      `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "there",
    company: lead.company_name || "your company",
    industry: lead.industry || "your industry",
    city: lead.city || "",
    state: lead.state || "",
    email: lead.email,
  };
}

// Replace template variables in text
export function replaceVariables(
  text: string,
  variables: TemplateVariables
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

// Personalize email template with lead data
export function personalizeTemplate(
  template: {
    subject: string;
    body_html: string;
    body_text?: string | null;
  },
  lead: Lead
): PersonalizedContent {
  const variables = buildVariables(lead);

  return {
    subject: replaceVariables(template.subject, variables),
    html: replaceVariables(template.body_html, variables),
    text: template.body_text
      ? replaceVariables(template.body_text, variables)
      : undefined,
  };
}

// Extract variable names from template
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g) || [];
  const uniqueVars = [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
  return uniqueVars;
}

// Generate unsubscribe token
export function generateUnsubscribeToken(): string {
  return nanoid(32);
}

// Add compliance footer to email
export function addComplianceFooter(
  html: string,
  unsubscribeToken: string,
  appUrl: string
): string {
  const footer = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #666666; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <p style="margin: 0 0 8px 0;">
        <strong>Operator OS</strong><br>
        Austin, TX 78701
      </p>
      <p style="margin: 0;">
        You received this email because you were identified as a potential fit for our AI services.
        <a href="${appUrl}/unsubscribe/${unsubscribeToken}" style="color: #666666; text-decoration: underline;">
          Unsubscribe
        </a>
      </p>
    </div>
  `;

  // Insert before closing body tag if exists, otherwise append
  if (html.includes("</body>")) {
    return html.replace("</body>", `${footer}</body>`);
  }
  return html + footer;
}

// Add tracking pixel to email
export function addTrackingPixel(
  html: string,
  campaignLeadId: string,
  appUrl: string
): string {
  const pixel = `<img src="${appUrl}/api/track/open/${campaignLeadId}" width="1" height="1" style="display:none;" alt="" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }
  return html + pixel;
}

// Wrap links for click tracking
export function wrapLinksForTracking(
  html: string,
  campaignLeadId: string,
  appUrl: string
): string {
  // Match href attributes with URLs
  const linkRegex = /href="(https?:\/\/[^"]+)"/g;

  return html.replace(linkRegex, (match, url) => {
    // Skip unsubscribe links
    if (url.includes("/unsubscribe/")) {
      return match;
    }

    const encodedUrl = encodeURIComponent(url);
    return `href="${appUrl}/api/track/click/${campaignLeadId}?url=${encodedUrl}"`;
  });
}

// Process email with all tracking and compliance additions
export function processEmailForSending(
  html: string,
  campaignLeadId: string,
  unsubscribeToken: string,
  appUrl: string
): string {
  let processed = html;

  // Add compliance footer
  processed = addComplianceFooter(processed, unsubscribeToken, appUrl);

  // Add tracking pixel
  processed = addTrackingPixel(processed, campaignLeadId, appUrl);

  // Wrap links for click tracking
  processed = wrapLinksForTracking(processed, campaignLeadId, appUrl);

  return processed;
}
