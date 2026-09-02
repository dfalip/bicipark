(() => {
  "use strict";

  const OFFICIAL_DISTANCE_KM = 53.1;
  const GPX_LOCAL = "./data/gpx/izarpe-route-5-plazaola.gpx";

  const base = {
    name: "Camping Izarpe",
    lat: 42.93854,
    lng: -1.69241
  };

  const pois = [
    {
      name: "Latasa",
      detail: "Via Verde del Plazaola / antiga estacio",
      lat: 42.951466,
      lng: -1.6527655
    },
    {
      name: "Irurtzun",
      detail: "Zona de Dos Hermanas",
      lat: 42.91832,
      lng: -1.82816
    },
    {
      name: "Osacar / Beorburu",
      detail: "Zona de l'ascensio a San Bartolome",
      lat: 42.919,
      lng: -1.730
    }
  ];

  const els = {
    status: document.getElementById("gpxStatus"),
    file: document.getElementById("gpxFile"),
    chart: document.getElementById("elevationChart"),
    chartDistance: document.getElementById("chartDistance"),
    chartElevation: document.getElementById("chartElevation")
  };

  const map = L.map("routeMap", {
    preferCanvas: true
  }).setView([42.93, -1.72], 11);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors"
    }
  ).addTo(map);

  const baseIcon = L.divIcon({
    className: "",
    html:
      '<div style="' +
      'width:50px;height:50px;border-radius:50%;' +
      'display:grid;place-items:center;' +
      'background:#14834f;border:4px solid #fff;' +
      'box-shadow:0 7px 18px rgba(0,0,0,.25);' +
      'font-size:24px;">&#127957;</div>',
    iconSize: [50, 50],
    iconAnchor: [25, 25]
  });

  L.marker([base.lat, base.lng], { icon: baseIcon })
    .addTo(map)
    .bindPopup("<strong>Camping Izarpe</strong><br>Bike Base");

  pois.forEach((poi, index) => {
    const marker = L.circleMarker(
      [poi.lat, poi.lng],
      {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: index === 0 ? "#d96c0b" : "#14834f",
        fillOpacity: 1
      }
    ).addTo(map);

    marker.bindPopup(
      "<strong>" + poi.name + "</strong><br>" + poi.detail
    );
  });

  let routeLayer = null;
  let elevationData = [];

  function haversineKm(a, b) {
    const R = 6371;
    const toRad = value => value * Math.PI / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;

    return 2 * R * Math.atan2(
      Math.sqrt(aa),
      Math.sqrt(1 - aa)
    );
  }

  function parseGpx(xmlText) {
    const xml = new DOMParser().parseFromString(
      xmlText,
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("GPX XML invalid");
    }

    let nodes = Array.from(xml.querySelectorAll("trkpt"));

    if (!nodes.length) {
      nodes = Array.from(xml.querySelectorAll("rtept"));
    }

    if (!nodes.length) {
      throw new Error("No track points found");
    }

    let distance = 0;
    let previous = null;

    return nodes
      .map(node => {
        const lat = Number(node.getAttribute("lat"));
        const lng = Number(node.getAttribute("lon"));
        const eleNode = node.querySelector("ele");
        const ele = eleNode ? Number(eleNode.textContent) : NaN;

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        const point = { lat, lng, ele, distance };

        if (previous) {
          distance += haversineKm(previous, point);
          point.distance = distance;
        }

        previous = point;
        return point;
      })
      .filter(Boolean);
  }

  function renderTrack(points) {
    if (routeLayer && map.hasLayer(routeLayer)) {
      map.removeLayer(routeLayer);
    }

    const latlngs = points.map(point => [point.lat, point.lng]);

    routeLayer = L.polyline(
      latlngs,
      {
        color: "#d96c0b",
        weight: 5,
        opacity: .92,
        lineJoin: "round"
      }
    ).addTo(map);

    const bounds = routeLayer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(.08));
    }

    elevationData = points.filter(point =>
      Number.isFinite(point.ele)
    );

    const trackDistance =
      points.length > 1
        ? points[points.length - 1].distance
        : 0;

    els.chartDistance.textContent =
      "Track GPX: " +
      trackDistance.toFixed(1).replace(".", ",") +
      " km | Oficial: 53,1 km";

    drawElevationChart();

    els.status.classList.remove("error");
    els.status.textContent =
      "GPX carregat: " +
      points.length +
      " punts de track. El tracat taronja es la ruta GPX.";
  }

  function drawElevationChart() {
    const canvas = els.chart;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(700, Math.floor(rect.width * dpr));
    canvas.height = Math.floor(220 * dpr);

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (elevationData.length < 2) {
      ctx.font = `${14 * dpr}px sans-serif`;
      ctx.fillStyle = "#667185";
      ctx.fillText(
        "Perfil disponible quan es carregui un GPX amb altitud.",
        20 * dpr,
        45 * dpr
      );
      return;
    }

    const padL = 46 * dpr;
    const padR = 18 * dpr;
    const padT = 18 * dpr;
    const padB = 32 * dpr;

    const w = canvas.width - padL - padR;
    const h = canvas.height - padT - padB;

    const elevations = elevationData.map(point => point.ele);
    const minEle = Math.floor(Math.min(...elevations) / 50) * 50;
    const maxEle = Math.ceil(Math.max(...elevations) / 50) * 50;
    const range = Math.max(1, maxEle - minEle);

    const maxDistance =
      elevationData[elevationData.length - 1].distance ||
      OFFICIAL_DISTANCE_KM;

    function x(point) {
      return padL + (point.distance / maxDistance) * w;
    }

    function y(point) {
      return padT + h - ((point.ele - minEle) / range) * h;
    }

    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = "#dfe6e2";
    ctx.fillStyle = "#667185";
    ctx.font = `${11 * dpr}px sans-serif`;

    for (let i = 0; i <= 4; i += 1) {
      const ratio = i / 4;
      const yy = padT + h - ratio * h;
      const elevation = Math.round(minEle + ratio * range);

      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(padL + w, yy);
      ctx.stroke();

      ctx.fillText(
        elevation + " m",
        3 * dpr,
        yy + 4 * dpr
      );
    }

    ctx.beginPath();

    elevationData.forEach((point, index) => {
      const px = x(point);
      const py = y(point);

      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });

    ctx.lineTo(padL + w, padT + h);
    ctx.lineTo(padL, padT + h);
    ctx.closePath();

    ctx.fillStyle = "rgba(217,108,11,.16)";
    ctx.fill();

    ctx.beginPath();

    elevationData.forEach((point, index) => {
      const px = x(point);
      const py = y(point);

      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });

    ctx.strokeStyle = "#d96c0b";
    ctx.lineWidth = 3 * dpr;
    ctx.stroke();

    ctx.fillStyle = "#667185";
    ctx.font = `${11 * dpr}px sans-serif`;

    for (let i = 0; i <= 4; i += 1) {
      const km = maxDistance * (i / 4);
      const xx = padL + w * (i / 4);

      ctx.fillText(
        km.toFixed(0) + " km",
        xx - 12 * dpr,
        canvas.height - 8 * dpr
      );
    }

    els.chartElevation.textContent =
      "Altitud GPX: " +
      Math.round(Math.min(...elevations)) +
      " - " +
      Math.round(Math.max(...elevations)) +
      " m";
  }

  async function loadLocalGpx() {
    try {
      const response = await fetch(
        GPX_LOCAL,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("GPX local not found");
      }

      const text = await response.text();
      renderTrack(parseGpx(text));
    } catch (error) {
      els.status.classList.add("error");
      els.status.textContent =
        "No s'ha trobat el GPX local. " +
        "Pots descarregar el GPX oficial amb el boto superior " +
        "i seleccionar-lo a continuacio.";
      drawElevationChart();
    }
  }

  els.file.addEventListener("change", async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      const text = await file.text();
      renderTrack(parseGpx(text));
    } catch (error) {
      els.status.classList.add("error");
      els.status.textContent =
        "No s'ha pogut llegir aquest fitxer GPX.";
    }
  });

  window.addEventListener("resize", () => {
    window.clearTimeout(window.__biciparkElevationResize);

    window.__biciparkElevationResize =
      window.setTimeout(drawElevationChart, 150);
  });

  loadLocalGpx();
})();
