// Current-location weather for the header widget. Free, no-API-key services
// (Open-Meteo for conditions, BigDataCloud for reverse geocoding) so there's
// no key to provision or leak. Not part of the Supabase data layer in
// hooks.ts — this never touches the database.

import { useQuery } from '@tanstack/react-query'

export interface CurrentWeather {
  city: string
  temperatureF: number
  emoji: string
  description: string
}

const WEATHER_CODES: Record<number, { emoji: string; description: string }> = {
  0: { emoji: '☀️', description: 'Clear sky' },
  1: { emoji: '🌤️', description: 'Mainly clear' },
  2: { emoji: '⛅', description: 'Partly cloudy' },
  3: { emoji: '☁️', description: 'Overcast' },
  45: { emoji: '🌫️', description: 'Fog' },
  48: { emoji: '🌫️', description: 'Depositing rime fog' },
  51: { emoji: '🌦️', description: 'Light drizzle' },
  53: { emoji: '🌦️', description: 'Drizzle' },
  55: { emoji: '🌦️', description: 'Dense drizzle' },
  56: { emoji: '🌧️', description: 'Freezing drizzle' },
  57: { emoji: '🌧️', description: 'Dense freezing drizzle' },
  61: { emoji: '🌧️', description: 'Slight rain' },
  63: { emoji: '🌧️', description: 'Rain' },
  65: { emoji: '🌧️', description: 'Heavy rain' },
  66: { emoji: '🌧️', description: 'Freezing rain' },
  67: { emoji: '🌧️', description: 'Heavy freezing rain' },
  71: { emoji: '❄️', description: 'Slight snow' },
  73: { emoji: '❄️', description: 'Snow' },
  75: { emoji: '❄️', description: 'Heavy snow' },
  77: { emoji: '❄️', description: 'Snow grains' },
  80: { emoji: '🌦️', description: 'Slight rain showers' },
  81: { emoji: '🌧️', description: 'Rain showers' },
  82: { emoji: '🌧️', description: 'Violent rain showers' },
  85: { emoji: '🌨️', description: 'Slight snow showers' },
  86: { emoji: '🌨️', description: 'Heavy snow showers' },
  95: { emoji: '⛈️', description: 'Thunderstorm' },
  96: { emoji: '⛈️', description: 'Thunderstorm with hail' },
  99: { emoji: '⛈️', description: 'Thunderstorm with heavy hail' },
}

function describeWeatherCode(code: number) {
  return WEATHER_CODES[code] ?? { emoji: '🌡️', description: 'Unknown' }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 30 * 60_000,
    })
  })
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
  )
  if (!res.ok) throw new Error('Reverse geocoding failed')
  const data = await res.json()
  return data.city || data.locality || data.principalSubdivision || 'your location'
}

async function fetchConditions(lat: number, lon: number): Promise<{ temperatureF: number; code: number }> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`,
  )
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  return { temperatureF: Math.round(data.current.temperature_2m), code: data.current.weather_code }
}

/**
 * Current city + conditions, from the browser's geolocation. Resolves to
 * undefined (no data, no error UI) if location access is denied or
 * unsupported — the header widget just doesn't render.
 */
export function useCurrentWeather() {
  return useQuery({
    queryKey: ['current-weather'],
    queryFn: async (): Promise<CurrentWeather> => {
      const position = await getCurrentPosition()
      const { latitude, longitude } = position.coords
      const [city, conditions] = await Promise.all([
        reverseGeocodeCity(latitude, longitude),
        fetchConditions(latitude, longitude),
      ])
      const { emoji, description } = describeWeatherCode(conditions.code)
      return { city, temperatureF: conditions.temperatureF, emoji, description }
    },
    staleTime: 15 * 60_000,
    gcTime: 60 * 60_000,
    retry: false,
  })
}
