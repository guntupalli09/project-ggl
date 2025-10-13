# 🛡️ API Protection & Rate Limiting Guide

## Current Protection Measures

### 1. **Rate Limiting**
- **Google Places API**: 10 requests/minute, 1000 requests/day
- **Google Business API**: 5 requests/minute, 100 requests/day
- **Automatic cooldown** when limits exceeded

### 2. **Caching System**
- **30-minute cache** for Google Places reviews
- **Automatic cache invalidation** after TTL
- **Memory-based storage** (resets on server restart)

### 3. **Error Handling**
- **429 status codes** for rate limit exceeded
- **Retry-after headers** with cooldown times
- **Graceful degradation** with cached data

## Environment Variables for API Limits

Add these to your `.env` file:

```env
# Google API Configuration
GOOGLE_PLACES_API_KEY=your_places_api_key_here
VITE_GOOGLE_CLIENT_ID=your_oauth_client_id_here

# Rate Limiting (Optional - defaults shown)
GOOGLE_PLACES_RATE_LIMIT=10
GOOGLE_PLACES_DAILY_LIMIT=1000
GOOGLE_BUSINESS_RATE_LIMIT=5
GOOGLE_BUSINESS_DAILY_LIMIT=100

# Cache Settings (Optional - defaults shown)
CACHE_TTL_MINUTES=30
CACHE_CLEANUP_INTERVAL=300000
```

## API Usage Monitoring

### Check Current Rate Limits
```bash
# Check server logs for rate limit status
curl http://localhost:3001/api/health
```

### Monitor API Calls
The server logs will show:
- `Rate limit remaining: X` - Requests left in current minute
- `Returning cached data` - When serving from cache
- `Rate limit exceeded` - When limits are hit

## Best Practices

### 1. **Frontend Implementation**
```javascript
// Handle rate limiting in your frontend
const fetchReviews = async () => {
  try {
    const response = await fetch('/api/google/places/reviews')
    
    if (response.status === 429) {
      const data = await response.json()
      console.log(`Rate limited. Retry after ${data.retry_after} seconds`)
      // Show user-friendly message
      return
    }
    
    const data = await response.json()
    if (data.cached) {
      console.log('Serving cached data')
    }
    
    return data
  } catch (error) {
    console.error('API Error:', error)
  }
}
```

### 2. **Database Optimization**
- Reviews are stored once and served from cache
- No duplicate API calls for same Place ID
- Automatic cleanup of old cache entries

### 3. **Production Considerations**
- Consider using Redis for persistent caching
- Implement database-based rate limiting
- Add API key rotation for higher limits
- Monitor API usage with analytics

## Troubleshooting

### Rate Limit Exceeded
1. **Check server logs** for current usage
2. **Wait for cooldown period** (usually 1-5 minutes)
3. **Use cached data** if available
4. **Consider upgrading** Google API quotas

### Cache Issues
1. **Restart server** to clear memory cache
2. **Check cache TTL** settings
3. **Verify cache keys** are unique per Place ID

### API Key Issues
1. **Verify API key** is correct
2. **Check API quotas** in Google Cloud Console
3. **Enable required APIs** (Places API, Business Profile API)

## Advanced Configuration

### Custom Rate Limits
```javascript
// In server.js, modify API_LIMITS
const API_LIMITS = {
  google_places: {
    requests_per_minute: 20,  // Increase if needed
    requests_per_day: 2000,   // Increase if needed
    cooldown_minutes: 3       // Reduce cooldown
  }
}
```

### Persistent Caching (Redis)
```javascript
// Replace memory cache with Redis
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

function setCache(key, data, ttlMinutes = 30) {
  redis.setex(key, ttlMinutes * 60, JSON.stringify(data))
}

function getCache(key) {
  return redis.get(key).then(data => data ? JSON.parse(data) : null)
}
```

## Monitoring & Alerts

### Set up monitoring for:
- API call frequency
- Cache hit rates
- Rate limit violations
- Error rates

### Recommended tools:
- **Google Cloud Monitoring** for API quotas
- **Application logs** for rate limiting
- **Database queries** for cache performance

---

## Quick Start

1. **Add environment variables** to `.env`
2. **Restart server** to apply new limits
3. **Test API calls** to verify protection
4. **Monitor logs** for rate limiting behavior

Your API is now protected against quota exhaustion! 🚀
