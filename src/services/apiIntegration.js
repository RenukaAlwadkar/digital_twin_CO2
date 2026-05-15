export const fetchDelhiWeather = async () => {
  try {
    // Open-Meteo for New Delhi (Lat: 28.6139, Lon: 77.2090)
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current_weather=true');
    const data = await response.json();
    return {
      temperature: data.current_weather.temperature,
      windSpeed: data.current_weather.windspeed,
      timestamp: data.current_weather.time
    };
  } catch (err) {
    console.error("Failed to fetch weather API", err);
    return null;
  }
};
