// Leave YOUR_API_KEY as a placeholder as requested by the user
const API_KEY = '4eba3a521b5042e954fb52fc90d13eea';
const LAT = 28.6139; // New Delhi Latitude
const LON = 77.2090; // New Delhi Longitude

export const fetchOpenWeatherData = async () => {

  try {
    // Fetch Weather Data
    const weatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&appid=${API_KEY}&units=metric`);
    const weatherData = await weatherResponse.json();

    // Fetch Air Pollution Data
    const pollutionResponse = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${LAT}&lon=${LON}&appid=${API_KEY}`);
    const pollutionData = await pollutionResponse.json();

    const result = {
      temperature: weatherData.main.temp,
      humidity: weatherData.main.humidity,
      wind_speed: weatherData.wind.speed,
      aqi: pollutionData.list[0].main.aqi,
      pm2_5: pollutionData.list[0].components.pm2_5,
      no2: pollutionData.list[0].components.no2
    };

    console.log("☁️ [API] Real-time OpenWeather Data Received:", result);

    return result;
  } catch (error) {
    console.error("Failed to fetch OpenWeather API:", error);
    return null;
  }
};
