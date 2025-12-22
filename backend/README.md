# Split App - Secure API Backend

This is a Vercel serverless function that securely proxies requests to the Gemini API, keeping your API key safe.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Deploy to Vercel

```bash
# Login to Vercel (first time only)
npx vercel login

# Deploy
npx vercel --prod
```

### 3. Set Environment Variables

After deployment, go to your Vercel Dashboard:
1. Select your project
2. Go to **Settings** > **Environment Variables**
3. Add `GEMINI_API_KEY` with your API key value

### 4. Update Your App

Replace the placeholder URL in `services/geminiService.ts` with your actual Vercel deployment URL:

```typescript
const BACKEND_URL = "https://your-project-name.vercel.app";
```

## Local Development

```bash
# Create local env file
cp .env.example .env.local
# Edit .env.local with your API key

# Run locally
npm run dev
```

## API Endpoint

### POST /api/analyze-receipt

**Request Body:**
```json
{
  "imageBase64": "base64_encoded_image_data",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "restaurantName": "Restaurant Name",
  "total": 42.75,
  "tax": 3.50,
  "tip": 0,
  "menuItems": [...]
}
```
