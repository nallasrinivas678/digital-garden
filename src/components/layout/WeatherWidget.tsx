import { useCurrentWeather } from '../../lib/weather'

/** Silently renders nothing while loading or if location access is denied. */
export default function WeatherWidget() {
  const { data } = useCurrentWeather()
  if (!data) return null

  return (
    <span
      title={`${data.description} in ${data.city}`}
      className="hidden sm:inline font-mono text-xs text-slate-500 whitespace-nowrap"
    >
      {data.emoji} {data.temperatureF}°F · {data.city}
    </span>
  )
}
