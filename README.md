# Stock Wizard

AI-powered stock recommendation service built with Next.js 14.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: OpenAI GPT-4o-mini
- **Database**: Supabase
- **Caching**: Upstash Redis
- **Validation**: Zod
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
pnpm build
pnpm start
```

## Project Structure

```
src/
├── app/              # Next.js App Router
├── components/       # React components
├── lib/             # Utilities and integrations
│   ├── supabase.ts
│   ├── openai.ts
│   └── redis.ts
└── types/           # TypeScript types
```

## License

MIT
