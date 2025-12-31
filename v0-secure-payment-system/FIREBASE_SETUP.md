# Firebase Google Login Setup Guide

## Overview
The application now has Google login integrated with Firebase. Users can sign in using their Google accounts without storing any data (as requested).

## Setup Instructions

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Enter a project name and proceed through the setup

### 2. Register Your App
1. In Firebase Console, click the web icon `</>` to add a web app
2. Register the app with your domain name
3. Copy the Firebase configuration values

### 3. Enable Google Sign-In
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Select a support email for Google Sign-In
4. Save changes

### 4. Add Environment Variables
Update your `.env.local` file with the Firebase config values from step 2:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 5. Configure OAuth Consent Screen (for local development)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen for "External" user type
5. Add your email as a test user

### 6. Test Locally
Run your application:
```bash
npm run dev
```

Visit `http://localhost:3000/login` and click "Continue with Google"

## Implementation Details

### Files Modified/Created:
- **`lib/firebase.ts`** - Firebase initialization and auth setup
- **`lib/auth-store.ts`** - Enhanced with Firebase user conversion
- **`app/login/page.tsx`** - Integrated Google Sign-In popup
- **`.env.local`** - Firebase configuration values

### Key Features:
- ✅ Google popup sign-in flow
- ✅ Automatic Firebase authentication
- ✅ User data stored in local state (Zustand)
- ✅ No database persistence (as requested)
- ✅ Auth persistence across page reloads
- ✅ Automatic redirect to dashboard on login
- ✅ Error handling with user feedback

### User Flow:
1. User visits `/login`
2. Clicks "Continue with Google"
3. Google popup appears
4. User authenticates with Google
5. Firebase verifies the token
6. User data loaded into app state
7. Redirects to `/dashboard`
8. On refresh, `onAuthStateChanged` restores session

## Security Notes
- All Firebase credentials use `NEXT_PUBLIC_` prefix (safe for client-side)
- Private keys never exposed
- Google handles actual authentication
- No sensitive data stored locally
- CORS properly configured in Firebase

## Troubleshooting

**"API key not valid"** - Check your `.env.local` values
**"Origin not authorized"** - Add your domain to Firebase allowed origins
**"Popup blocked"** - Browser blocked the Google popup (check permissions)
**"Auth domain mismatch"** - Ensure FIREBASE_AUTH_DOMAIN matches your project

## Next Steps
- User data persists in Zustand store (not in database)
- On logout, user data is cleared
- On new session, Firebase re-authenticates automatically
- Add role selection after login if needed
