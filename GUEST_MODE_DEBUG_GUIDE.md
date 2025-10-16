# 🔍 Guest Mode Debug Guide

## 🎯 Issue: Guest Mode Warning Not Showing

### ✅ What I've Implemented:

1. **Guest Mode Detection**: `isGuestUser()` function in `src/lib/authUtils.ts`
2. **Warning Component**: `GuestModeWarning` component in `src/components/GuestModeWarning.tsx`
3. **Conditional Rendering**: Added to `src/pages/CallsAndMessages.tsx`
4. **Debug Logging**: Added console logs to track the issue

### 🔧 Debugging Steps:

#### **Step 1: Check Guest Mode Status**
Open browser console and run:
```javascript
// Check if guest mode is enabled
console.log('is_guest:', localStorage.getItem('is_guest'))

// Check if isGuestUser() returns true
// (This should be logged automatically in the console)
```

#### **Step 2: Enable Guest Mode for Testing**
In browser console, run:
```javascript
// Enable guest mode
localStorage.setItem('is_guest', 'true')

// Refresh the page
location.reload()
```

#### **Step 3: Test the Guest Mode Test Page**
Navigate to: `http://localhost:5173/guest-test`

This page will show:
- Current guest mode status
- Debug information
- The warning component (if in guest mode)
- Instructions for testing

#### **Step 4: Check Console Logs**
Look for these logs in the browser console:
```
🔍 CallsAndMessages: isGuestUser(): true/false
🔍 CallsAndMessages: localStorage.is_guest: true/false
🔍 GuestModeWarning: Rendering with props: {...}
```

### 🎯 Expected Behavior:

#### **When in Guest Mode:**
- `isGuestUser()` returns `true`
- `localStorage.getItem('is_guest')` returns `"true"`
- Yellow warning banner appears at the top
- Main content is hidden
- Console shows debug logs

#### **When NOT in Guest Mode:**
- `isGuestUser()` returns `false`
- `localStorage.getItem('is_guest')` returns `null`
- No warning banner
- Main content shows normally

### 🚨 Common Issues:

1. **localStorage not set**: Run `localStorage.setItem('is_guest', 'true')`
2. **Component not rendering**: Check console for errors
3. **Conditional logic issue**: Check if `isGuestUser()` returns correct value
4. **Import issues**: Verify `GuestModeWarning` is imported correctly

### 🔧 Quick Fixes:

#### **Force Enable Guest Mode:**
```javascript
localStorage.setItem('is_guest', 'true')
location.reload()
```

#### **Disable Guest Mode:**
```javascript
localStorage.removeItem('is_guest')
location.reload()
```

#### **Check Component Rendering:**
```javascript
// In browser console, check if component exists
console.log('GuestModeWarning:', typeof GuestModeWarning)
```

### 📱 Test URLs:

- **Calls & Messages**: `http://localhost:5173/messages`
- **Guest Mode Test**: `http://localhost:5173/guest-test`

### 🎉 Success Indicators:

✅ Console shows: `isGuestUser(): true`  
✅ Console shows: `localStorage.is_guest: true`  
✅ Yellow warning banner appears  
✅ Console shows: `GuestModeWarning: Rendering with props`  
✅ Main content is hidden  

If all these are true, the guest mode warning is working correctly!
