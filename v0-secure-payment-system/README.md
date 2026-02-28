# Secure payment system

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pattabshettishan-6111s-projects/v0-secure-payment-system)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/pd3fob1pHYQ)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/pattabshettishan-6111s-projects/v0-secure-payment-system](https://vercel.com/pattabshettishan-6111s-projects/v0-secure-payment-system)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/pd3fob1pHYQ](https://v0.app/chat/pd3fob1pHYQ)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Support & Voice Assistant

- A floating assistant appears on key pages (e.g., Invoice). It supports basic voice (browser-dependent) and text inputs for quick help like “check status” or “contact support”.
- To reach support directly, navigate to `/support` or use the assistant’s "Contact Support" button. The support page accepts optional query parameters like `code` and `from` for context.

### Gemini AI Integration

- Set your API key in `v0-secure-payment-system/.env.local`:

	```env
	GOOGLE_API_KEY=your_google_api_key_here
	```

- The assistant calls `/api/assistant` using Google Gemini (1.5 Flash) for concise guidance. If the key is missing or the API fails, it falls back to built-in responses.
