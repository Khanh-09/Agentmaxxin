/**
 * REAL PAID WEATHER API POWERED BY OPEN-METEO
 *
 * Micro-payment enabled endpoint:
 * 1. Checks and verifies x402 payment signature (0.01 USDC).
 * 2. Fetches real geocoding & live weather data from Open-Meteo.
 */
import { verifyPayment } from "@/agent/wallet";

const PRICE = "0.01";
const ASSET = "USDC";
const PAY_TO = "0x000000000000000000000000000000000000dEaD"; // API Owner wallet

function decodeWeatherCode(code: number): string {
  const codes: Record<number, string> = {
    0: "Clear sky ☀️",
    1: "Mainly clear 🌤️",
    2: "Partly cloudy ⛅",
    3: "Overcast ☁️",
    45: "Foggy 🌫️",
    48: "Depositing rime fog 🌫️",
    51: "Light drizzle 🌦️",
    53: "Moderate drizzle 🌧️",
    55: "Dense drizzle 🌧️",
    61: "Slight rain 🌧️",
    63: "Moderate rain 🌧️",
    65: "Heavy rain ⛈️",
    71: "Slight snow 🌨️",
    73: "Moderate snow 🌨️",
    75: "Heavy snow ❄️",
    80: "Slight rain showers 🌦️",
    81: "Moderate rain showers 🌧️",
    82: "Violent rain showers ⛈️",
    95: "Thunderstorm ⚡",
    96: "Thunderstorm with slight hail ⛈️",
    99: "Thunderstorm with heavy hail ⛈️",
  };
  return codes[code] || "Variable conditions 🌤️";
}

export async function GET(req: Request) {
  const cityQuery = new URL(req.url).searchParams.get("city") ?? "London";

  // Step 1: Verify Payment Header
  const payment = await verifyPayment(req.headers.get("X-PAYMENT"));
  if (!payment || payment.to !== PAY_TO || Number(payment.amount) < Number(PRICE)) {
    return Response.json(
      {
        error: "Payment Required",
        price: PRICE,
        asset: ASSET,
        payTo: PAY_TO,
        message: `This API requires ${PRICE} ${ASSET} per request. Provide signed X-PAYMENT header.`,
      },
      { status: 402 }
    );
  }

  // Step 2: Fetch Live Geocoding & Weather from Open-Meteo
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { headers: { Accept: "application/json" } });
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return Response.json({
        city: cityQuery,
        error: `Location '${cityQuery}' not found in Open-Meteo database.`,
        paidBy: payment.from,
      });
    }

    const location = geoData.results[0];
    const { latitude, longitude, name, country, admin1, timezone } = location;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(timezone || "auto")}`;
    const weatherRes = await fetch(weatherUrl, { headers: { Accept: "application/json" } });
    const weatherData = await weatherRes.json();

    const current = weatherData.current || {};
    const condition = decodeWeatherCode(current.weather_code ?? 0);

    return Response.json({
      city: name,
      region: admin1 || country,
      country: country,
      coordinates: { latitude, longitude },
      temperatureC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidity: `${current.relative_humidity_2m}%`,
      windSpeed: `${current.wind_speed_10m} km/h`,
      precipitation: `${current.precipitation} mm`,
      isDay: Boolean(current.is_day),
      condition,
      paidBy: payment.from,
      paidAmount: `${PRICE} ${ASSET}`,
      dataSource: "Open-Meteo Live API",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        error: `Failed to fetch live weather: ${err instanceof Error ? err.message : String(err)}`,
        paidBy: payment.from,
      },
      { status: 500 }
    );
  }
}

