(() => {
  "use strict";

  const routes = Array.isArray(window.BICIPARK_IZARPE_ROUTES)
    ? window.BICIPARK_IZARPE_ROUTES
    : [];

  const base = window.BICIPARK_IZARPE_BASE || {
    name: "Camping Izarpe",
    lat: 42.93854,
    lng: -1.69241
  };

  const params = new URLSearchParams(window.location.search);
  const routeId = params.get("id") || "5";
  const route = routes.find(item => item.id === routeId);

  if (!route) {
    document.querySelector(".route-page").innerHTML =
      "<section class='route-hero'><h1>Ruta no trobada</h1>" +
      "<p>Torna a Bike Bases i selecciona una ruta valida.</p></section>";
    return;
  }

  document.title =
    route.name + " \u00B7 Bicipark \u00B7 Camping Izarpe";

  const els = {
    pageEyebrow: document.getElementById("pageEyebrow"),
    modePill: document.getElementById("modePill"),
    routePill: document.getElementById("routePill"),
    routeName: document.getElementById("routeName"),
    routeSummary: document.getElementById("routeSummary"),
    officialDistance: document.getElementById("officialDistance"),
    officialGain: document.getElementById("officialGain"),
    officialIbp: document.getElementById("officialIbp"),
    officialMode: document.getElementById("officialMode"),
    officialLink: document.getElementById("officialLink"),
    localGpxLink: document.getElementById("localGpxLink"),
    difficultyTitle: document.getElementById("difficultyTitle"),
    physicalDifficulty: document.getElementById("physicalDifficulty"),
    technicalDifficulty: document.getElementById("technicalDifficulty"),
    highlightsList: document.getElementById("highlightsList"),
    cautionsList: document.getElementById("cautionsList"),
    status: document.getElementById("gpxStatus"),
    file: document.getElementById("gpxFile"),
    chart: document.getElementById("elevationChart"),
    chartDistance: document.getElementById("chartDistance"),
    chartElevation: document.getElementById("chartElevation"),
    distanceExplanation: document.getElementById("distanceExplanation"),
    missionLink: document.getElementById("missionLink"),
    quickRouteNumber: document.getElementById("quickRouteNumber"),
    quickMode: document.getElementById("quickMode"),
    quickDistance: document.getElementById("quickDistance")
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value, decimals = 0) {
    if (!Number.isFinite(Number(value))) return "--";

    return Number(value)
      .toFixed(decimals)
      .replace(".", ",");
  }

  els.pageEyebrow.textContent =
    "BICIPARK \u00B7 BIKE BASE \u00B7 RUTA " + route.number;

  els.modePill.textContent = route.modeLabel.toUpperCase();
  els.routePill.textContent = "RUTA " + route.number;
  els.routeName.textContent = route.name;
  els.routeSummary.textContent = route.summary;
  els.officialDistance.textContent =
    formatNumber(route.distanceKm, route.distanceKm % 1 ? 1 : 0) + " km";
  els.officialGain.textContent =
    formatNumber(route.elevationGainM, 0) + " m+";
  els.officialIbp.textContent =
    route.ibp == null ? "--" : String(route.ibp);
  els.officialMode.textContent = route.modeLabel;

  if (els.quickRouteNumber) {
    els.quickRouteNumber.textContent =
      "Ruta " + route.number;
  }

  if (els.quickMode) {
    els.quickMode.textContent =
      route.modeLabel;
  }

  if (els.quickDistance) {
    els.quickDistance.textContent =
      formatNumber(
        route.distanceKm,
        route.distanceKm % 1 ? 1 : 0
      ) + " km";
  }
  els.officialLink.href = route.officialUrl;
  if (els.missionLink && route.id === "5") {
    els.missionLink.classList.remove("hidden");
  }
  els.localGpxLink.href =
    "./data/gpx/izarpe-route-" + route.id + ".gpx";

  els.physicalDifficulty.textContent = route.physical;
  els.technicalDifficulty.textContent = route.technical;
  els.difficultyTitle.textContent =
    route.physical + " / " + route.technical;

  els.highlightsList.innerHTML = route.highlights
    .map(item => `
      <li>
        <strong>${escapeHtml(item.title)}</strong>
        ${escapeHtml(item.text)}
      </li>
    `)
    .join("");

  els.cautionsList.innerHTML = route.cautions
    .map(item => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const map = L.map("routeMap", {
    preferCanvas: true
  }).setView([base.lat, base.lng], 11);

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

  function parseSegment(nodes, startDistance) {
    let distance = startDistance;
    let previous = null;

    const points = [];

    nodes.forEach(node => {
      const lat = Number(node.getAttribute("lat"));
      const lng = Number(node.getAttribute("lon"));
      const eleNode = node.querySelector("ele");
      const ele = eleNode ? Number(eleNode.textContent) : NaN;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const point = {
        lat,
        lng,
        ele,
        distance
      };

      if (previous) {
        distance += haversineKm(previous, point);
        point.distance = distance;
      }

      previous = point;
      points.push(point);
    });

    return {
      points,
      distance
    };
  }

  function parseGpx(xmlText) {
    const xml = new DOMParser().parseFromString(
      xmlText,
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error("GPX XML invalid");
    }

    const trackSegments = Array.from(
      xml.querySelectorAll("trkseg")
    );

    let totalDistance = 0;
    const segments = [];
    const allPoints = [];

    if (trackSegments.length) {
      trackSegments.forEach(segmentNode => {
        const nodes = Array.from(
          segmentNode.querySelectorAll(":scope > trkpt")
        );

        const parsed = parseSegment(nodes, totalDistance);

        if (parsed.points.length) {
          segments.push(parsed.points);
          allPoints.push(...parsed.points);
          totalDistance = parsed.distance;
        }
      });
    } else {
      const routeNodes = Array.from(
        xml.querySelectorAll("rtept")
      );

      const parsed = parseSegment(routeNodes, 0);

      if (parsed.points.length) {
        segments.push(parsed.points);
        allPoints.push(...parsed.points);
        totalDistance = parsed.distance;
      }
    }

    if (!allPoints.length) {
      throw new Error("No track points found");
    }

    return {
      segments,
      allPoints,
      totalDistance
    };
  }

  function renderTrack(parsed) {
    if (routeLayer && map.hasLayer(routeLayer)) {
      map.removeLayer(routeLayer);
    }

    const polylines = parsed.segments.map(segment =>
      segment.map(point => [point.lat, point.lng])
    );

    routeLayer = L.polyline(
      polylines,
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

    elevationData = parsed.allPoints.filter(point =>
      Number.isFinite(point.ele)
    );

    const trackDistance = parsed.totalDistance;

    els.chartDistance.textContent =
      "Distancia GPX calculada: " +
      formatNumber(trackDistance, 1) +
      " km";

    const difference =
      trackDistance - Number(route.distanceKm);

    els.distanceExplanation.textContent =
      "La fitxa publicada indica " +
      formatNumber(route.distanceKm, route.distanceKm % 1 ? 1 : 0) +
      " km. El calcul de Bicipark sobre els punts del GPX dona " +
      formatNumber(trackDistance, 1) +
      " km" +
      (Math.abs(difference) >= 0.2
        ? ". La diferencia pot venir del metode de calcul, simplificacio del track o versions diferents del GPX."
        : ".");

    drawElevationChart();

    els.status.classList.remove("error");
    els.status.textContent =
      "GPX carregat: " +
      parsed.allPoints.length +
      " punts en " +
      parsed.segments.length +
      " segment(s).";

    els.localGpxLink.style.display = "";
  }

  function drawElevationChart() {
    const canvas = els.chart;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.max(
      700,
      Math.floor(rect.width * dpr)
    );
    canvas.height = Math.floor(220 * dpr);

    const ctx = canvas.getContext("2d");

    ctx.clearRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

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

    const elevations =
      elevationData.map(point => point.ele);

    const minEle =
      Math.floor(Math.min(...elevations) / 50) * 50;

    const maxEle =
      Math.ceil(Math.max(...elevations) / 50) * 50;

    const range =
      Math.max(1, maxEle - minEle);

    const maxDistance =
      elevationData[elevationData.length - 1].distance ||
      route.distanceKm;

    function x(point) {
      return padL +
        (point.distance / maxDistance) * w;
    }

    function y(point) {
      return padT + h -
        ((point.ele - minEle) / range) * h;
    }

    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = "#dfe6e2";
    ctx.fillStyle = "#667185";
    ctx.font = `${11 * dpr}px sans-serif`;

    for (let i = 0; i <= 4; i += 1) {
      const ratio = i / 4;
      const yy = padT + h - ratio * h;
      const elevation =
        Math.round(minEle + ratio * range);

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

      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
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

      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
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
    const localPath =
      "./data/gpx/izarpe-route-" +
      route.id +
      ".gpx";

    els.localGpxLink.href = localPath;

    try {
      const response = await fetch(
        localPath,
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
        "GPX local no disponible per aquesta ruta. " +
        "Pots obrir la font publicada i descarregar el GPX, " +
        "o carregar-lo manualment aqui.";

      els.localGpxLink.style.display = "none";
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
    window.clearTimeout(
      window.__biciparkElevationResize
    );

    window.__biciparkElevationResize =
      window.setTimeout(
        drawElevationChart,
        150
      );
  });

  loadLocalGpx();
})();

