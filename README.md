# MarketingOS

Lead generation and email outreach platform by OperatorOS.

## Features

- **Lead Management**: Import, organize, and qualify leads
- **Email Campaigns**: Create and manage email outreach campaigns
- **Email Templates**: Build and personalize email templates
- **Scrapers**: Google Maps and search-based lead generation
- **Domain Warmup**: Automated sender reputation building
- **Analytics**: Track opens, clicks, and engagement
- **Compliance**: CAN-SPAM compliant with unsubscribe handling

## Tech Stack

- Next.js 15 (App Router)
- Supabase (Database + Auth)
- Upstash Redis (Rate limiting)
- Upstash QStash (Job queuing)
- Resend (Email delivery)

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in values
4. Run database migrations: `npx supabase db push`
5. Start development server: `npm run dev`

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
QSTASH_TOKEN=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

## License

Proprietary - OperatorOS
