import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Alert } from './ui/Alert'
import { MapPinIcon, LinkIcon } from '@heroicons/react/24/outline'

interface GooglePlaceIdFinderProps {
  onPlaceIdFound: (placeId: string, businessName: string, address: string) => void
  currentPlaceId?: string
}

export default function GooglePlaceIdFinder({ onPlaceIdFound, currentPlaceId }: GooglePlaceIdFinderProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const searchPlaces = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a business name and address')
      return
    }

    setIsSearching(true)
    setError('')
    setSearchResults([])

    try {
      // Use Google Places API Text Search
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
        `query=${encodeURIComponent(searchQuery)}&` +
        `key=${import.meta.env.VITE_GOOGLE_CLIENT_ID}`
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.status !== 'OK') {
        throw new Error(`Google Places API error: ${data.status}`)
      }

      setSearchResults(data.results || [])
      
      if (data.results?.length === 0) {
        setError('No businesses found. Try a different search term.')
      }
    } catch (err: any) {
      setError(`Search failed: ${err.message}`)
      console.error('Place search error:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const selectPlace = (place: any) => {
    onPlaceIdFound(place.place_id, place.name, place.formatted_address)
    setSuccess(`Selected: ${place.name}`)
    setSearchResults([])
    setSearchQuery('')
  }

  const openPlaceIdFinder = () => {
    window.open('https://developers.google.com/maps/documentation/places/web-service/place-id', '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MapPinIcon className="h-5 w-5 mr-2" />
          Find Your Google Place ID
        </CardTitle>
        <CardDescription>
          Search for your business to get its Google Place ID for reviews integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentPlaceId && (
          <Alert variant="success">
            <strong>Current Place ID:</strong> {currentPlaceId}
          </Alert>
        )}

        <div className="space-y-2">
          <Input
            label="Search for your business"
            placeholder="e.g., 'Your Business Name, City, State'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPlaces()}
          />
          <Button 
            onClick={searchPlaces} 
            loading={isSearching}
            className="w-full"
          >
            {isSearching ? 'Searching...' : 'Search Places'}
          </Button>
        </div>

        {error && (
          <Alert variant="error">
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success">
            {success}
          </Alert>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Search Results:</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {searchResults.map((place) => (
                <div
                  key={place.place_id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => selectPlace(place)}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {place.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {place.formatted_address}
                  </div>
                  {place.rating && (
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">
                      ⭐ {place.rating} ({place.user_ratings_total} reviews)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Can't find your business? Try the official Google Place ID Finder:
          </p>
          <Button
            variant="outline"
            onClick={openPlaceIdFinder}
            leftIcon={<LinkIcon className="h-4 w-4" />}
            className="w-full"
          >
            Open Google Place ID Finder
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
