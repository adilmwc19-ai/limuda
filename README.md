# לימודא (Limuda)

![Version](https://img.shields.io/badge/version-2.0.0-blue) ![Next.js](https://img.shields.io/badge/Next.js-16-black) ![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8) ![License](https://img.shields.io/badge/license-MIT-green)

**Limuda (לימודא)** is a modern Progressive Web App for daily Jewish text study — bringing Tanakh 929, Daily Mishnah, Daf Yomi, the Rambam's Mishneh Torah, Sefer HaMitzvot, Daily Tehillim, and more into a single distraction-free, fully accessible reading experience.

Built for learners who want their daily study to open instantly, work offline, and feel native on any device — desktop, Android, or iOS.

---

## Key Features

### 📖 Diverse Study Tracks
- **Tanakh 929**, **Daily Mishnah**, **Daf Yomi**, **Mishneh Torah (Rambam)**, **Sefer HaMitzvot**, **Daily Tehillim**, and additional tracks (Chofetz Chaim, Kitzur Shulchan Aruch, Perek Shirah)
- Texts and translations synced directly from the [Sefaria API](https://www.sefaria.org/), with graceful fallbacks for offline reading

### 🎨 Personalized Reading Experience
- Full control over font size, from compact to extra-large
- Day / night themes tuned for long reading sessions
- Local progress tracking per study track, saved on-device

### 📱 Advanced PWA Experience
- Seamless, guaranteed install prompt across desktop and mobile browsers
- Dedicated install banner that works even where native `beforeinstallprompt` support is inconsistent
- True standalone app mode after install — no browser chrome
- Silent background updates via service worker, with no disruptive reload prompts

### 🇮🇱 Authentic Hebrew & Accessibility
- Traditional Hebrew (Gematria) chapter and verse numbering
- Built-in protection against Google Translate and other automatic translation tools (`notranslate`)
- Full right-to-left (RTL) layout throughout
- Keyboard navigation and WCAG 2.1 AA–compliant contrast and semantics

---

## Architecture & Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Icons | [Lucide Icons](https://lucide.dev/) |
| Data source | [Sefaria API](https://www.sefaria.org/) |
| Backend / Storage | [Firebase](https://firebase.google.com/) |
| Deployment | [Vercel](https://vercel.com/) |

The app follows the Next.js App Router convention (`src/app`), with each study track implemented as its own route under `src/app/study/*` and a shared library of Sefaria data adapters in `src/lib`.

---

## Getting Started

### Prerequisites
- Node.js 18.18 or later
- npm (or yarn / pnpm / bun)

### Installation

```bash
git clone https://github.com/<your-org>/limuda1.git
cd limuda1
npm install
```

### Running locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app running.

### Building for production

```bash
npm run build
npm run start
```

---

## Deployment

Limuda is optimized for deployment on [Vercel](https://vercel.com/), the platform built by the creators of Next.js.

1. Push the repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/new).
3. Configure the required environment variables (see `.env.local`).
4. Deploy — Vercel will automatically build and host the production app.

Refer to the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for further details.

---

## License & Credits

This project is licensed under the **MIT License**.

Textual content and translations are provided by [Sefaria](https://www.sefaria.org/), a non-profit organization dedicated to building a living library of Jewish texts, freely accessible to all. Limuda is deeply grateful for their open API and data.
