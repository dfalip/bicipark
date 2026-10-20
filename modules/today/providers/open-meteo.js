(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.BiciParkOpenMeteo = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function weatherScore(temp, rainProbability, wind) {
    let score = 100;
    const t = Number(temp);
    const rain = Number(rainProbability);
    const w = Number(wind);
    if (Number.isFinite(t)) {
      if (t < 8) score -= (8 - t) * 3;
      if (t > 30) score -= (t - 30) * 4;
      if (t >= 12 && t <= 25) score += 3;
    }
    if (Number.isFinite(rain)) score -= rain * 0.45;
    if (Number.isFinite(w) && w > 12) score -= (w - 12) * 1.7;
    if (Number.isFinite(w) && w > 30) score -= 8;
    return clamp(Math.round(score), 0, 100);
  }

  function iconForCode(code, rainProbability = NaN) {
    const c = Number(code);
    const rain = Number(rainProbability);

    if (c >= 95) return "⛈️";
    if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return "🌨️";
    if (c === 45 || c === 48) return "🌫️";
    if (c === 3) return "☁️";
    if (c === 0) return "☀️";
    if (c === 1 || c === 2) return "🌤️";

    if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) {
      if (Number.isFinite(rain) && rain <= 10) return "🌤️";
      if (Number.isFinite(rain) && rain < 45) return "🌦️";
      return "🌧️";
    }

    if (Number.isFinite(rain)) {
      if (rain <= 10) return "🌤️";
      if (rain < 45) return "🌦️";
      return "🌧️";
    }

    return "🌤️";
  }

  function labelForScore(score) {
    if (score >= 85) return "Condicions excel·lents per pedalar";
    if (score >= 70) return "Bones condicions per pedalar";
    if (score >= 50) return "Condicions acceptables";
    return "Condicions poc favorables";
  }

  function hourNumber(time) {
    const match = String(time || "").match(/T(\d{2}):/);
    return match ? Number(match[1]) : -1;
  }

  function buildRows(data) {
    const h = data?.hourly || {};
    const times = Array.isArray(h.time) ? h.time : [];
    return times.map((time, index) => {
      const temp = Number(h.temperature_2m?.[index]);
      const rain = Number(h.precipitation_probability?.[index]);
      const wind = Number(h.wind_speed_10m?.[index]);
      const code = Number(h.weather_code?.[index]);
      return { time, temp, rain, wind, code, score: weatherScore(temp, rain, wind) };
    });
  }

  function formatHour(time) {
    const match = String(time || "").match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "";
  }

  function bestWindow(rows) {
    let best = null;
    for (let i = 0; i < rows.length - 1; i += 1) {
      const a = rows[i], b = rows[i + 1];
      const hour = hourNumber(a.time);
      if (hour < 6 || hour > 20) continue;
      const score = Math.round((a.score + b.score) / 2);
      if (!best || score > best.score) {
        const endHour = String((hourNumber(b.time) + 1) % 24).padStart(2, "0") + ":00";
        best = {
          score,
          label: `${formatHour(a.time)}–${endHour}`,
          temp: Math.round(((a.temp + b.temp) / 2) * 10) / 10,
          rain: Math.round((a.rain + b.rain) / 2),
          wind: Math.round((a.wind + b.wind) / 2),
          code: a.score >= b.score ? a.code : b.code
        };
      }
    }
    return best;
  }

  async function fetchForecast(lat, lng) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: "temperature_2m,precipitation_probability,wind_speed_10m,weather_code",
      timezone: "auto",
      forecast_days: "2"
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const data = await response.json();
    const rows = buildRows(data);
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const futureToday = rows.filter(row => row.time.startsWith(today) && hourNumber(row.time) >= now.getHours());
    const usable = futureToday.length ? futureToday : rows.slice(0, 24);
    const current = usable[0] || rows[0];
    if (!current) throw new Error("Open-Meteo sense dades horàries");
    const window = bestWindow(usable) || {
      score: current.score,
      label: formatHour(current.time),
      temp: current.temp,
      rain: current.rain,
      wind: current.wind,
      code: current.code
    };
    return {
      score: window.score,
      label: labelForScore(window.score),
      icon: iconForCode(window.code, window.rain),
      bestWindow: window,
      current: {
        time: current.time,
        temp: current.temp,
        rain: current.rain,
        wind: current.wind,
        code: current.code,
        icon: iconForCode(current.code, current.rain),
        score: current.score
      },
      source: "Open-Meteo",
      updatedAt: new Date().toISOString()
    };
  }

  return { weatherScore, iconForCode, labelForScore, bestWindow, fetchForecast };
});
