# hairstylist

Single-page Next.js app for hairstyle and beard look previews from front, side, and rear profile uploads.

## Local setup

1. Install dependencies:
   `npm install`
2. Create env file:
   `Copy-Item .env.example .env.local`
3. Set your API key in `.env.local`:
   `GOOGLE_API_KEY=...`
4. Run dev server:
   `npm run dev`

## Generation model

The app uses Google image-to-image generation via `gemini-2.5-flash-image` through the `@google/genai` SDK.
