# 🎯 Google Places API Setup (Using Your Existing Google Credentials)

## Quick Setup - 5 Minutes!

Since you already have Google Calendar working, we just need to add Places API access.

### **Step 1: Enable Places API (You Already Did This! ✅)**

You mentioned you already enabled Places API in Google Console - perfect!

### **Step 2: Add Places API Key to Environment Variables**

Add this to your `.env` file:

```bash
# You already have these:
VITE_GOOGLE_CLIENT_ID=your_existing_client_id
VITE_GOOGLE_CLIENT_SECRET=your_existing_client_secret

# Add this new one (use your existing API key or create a new one):
GOOGLE_PLACES_API_KEY=your_existing_or_new_api_key
```

**Option A: Use Your Existing API Key**
- If you have a Google API key already, just add it as `GOOGLE_PLACES_API_KEY`

**Option B: Create a New API Key (Recommended)**
- Go to Google Cloud Console → APIs & Services → Credentials
- Click "Create Credentials" → "API Key"
- Copy the new API key

### **Step 3: Add to Vercel Environment Variables**

In your Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `GOOGLE_PLACES_API_KEY` = `your_api_key`

### **Step 4: Find Your Google Place ID**

1. **Go to Google Place ID Finder**: https://developers.google.com/maps/documentation/places/web-service/place-id
2. **Search for your business** by name and address
3. **Copy the Place ID** (looks like: `ChIJN1t_tDeuEmsRUsoyG83frY4`)

### **Step 5: Update Your Profile**

1. **Go to Profile page** in your app
2. **Add your business information**:
   - Business Name
   - Business Address  
   - Business Website
   - **Google Place ID** (from Step 4)
3. **Save the changes**

### **Step 6: Test Real Reviews**

1. **Go to Reviews page**
2. **Click "Refresh Data"**
3. **You should see real Google reviews!** 🎉

---

## 🔧 **Technical Details**

### **What Happens:**
1. **Uses your existing Google OAuth** (same as Calendar)
2. **Fetches real reviews** from Google Places API
3. **Stores reviews** in your database
4. **Shows real data** instead of mock data

### **API Limits:**
- **Google Places API**: 1,000 requests/month FREE
- **Your existing Google OAuth**: No additional limits
- **Caching**: Reviews are cached to avoid hitting limits

### **Fallback System:**
- If Places API fails → Falls back to database reviews
- If no Place ID → Shows helpful error message
- If API key missing → Shows setup instructions

---

## 🎯 **Expected Results**

After setup, you'll have:
- ✅ **Real Google reviews** (not mock data)
- ✅ **Review management** (respond to reviews)
- ✅ **Referral tracking** (track referral requests)
- ✅ **Business intelligence** (real metrics)
- ✅ **Seamless integration** (uses existing Google setup)

**Your GGL app will fetch REAL data from Google!** 🚀
