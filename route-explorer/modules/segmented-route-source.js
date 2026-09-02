import {
  routeIntersectsBounds
} from "./geometry-loader.js";

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(
      `No s'ha pogut carregar ${path}`,
      error
    );

    return fallback;
  }
}

export async function loadSegmentedRouteSources(
  configurationPath = "./data/sources.json"
) {
  const configurations = await loadJson(
    configurationPath,
    []
  );

  const sources = [];
  const sections = [];

  for (const configuration of configurations) {
    if (configuration.enabled === false) {
      continue;
    }

    const catalog = await loadJson(
      configuration.catalog,
      null
    );

    if (!catalog) {
      continue;
    }

    const source = {
      ...configuration,
      ...(catalog.source || {})
    };

    sources.push(source);

    for (const section of catalog.sections || []) {
      sections.push({
        ...section,
        sourceId: source.id,
        sourceName: source.name,
        collectionId: source.id,
        collectionName: source.name,
        collectionColor:
          section.collectionColor ||
          source.color ||
          "#d6b900",
        segmented: true
      });
    }
  }

  return {
    sources,
    sections
  };
}

function getVisibilityBounds(
  mapBounds,
  zoom,
  source
) {
  if (zoom <= Number(source.wholeRouteZoom ?? 6)) {
    return null;
  }

  const padding = zoom <= 8
    ? Number(source.regionalPadding ?? 0.35)
    : zoom <= 10
      ? Number(source.localPadding ?? 0.12)
      : 0;

  return padding > 0
    ? mapBounds.pad(padding)
    : mapBounds;
}

export function getVisibleSegmentedSections({
  sources,
  sections,
  activeSourceIds,
  mapBounds,
  zoom
}) {
  const sourceById = new Map(
    sources.map(source => [source.id, source])
  );

  return sections.filter(section => {
    if (!section.geometryFile) {
      return false;
    }

    if (!activeSourceIds.has(section.sourceId)) {
      return false;
    }

    const source = sourceById.get(section.sourceId);

    if (!source) {
      return false;
    }

    const visibilityBounds = getVisibilityBounds(
      mapBounds,
      zoom,
      source
    );

    if (visibilityBounds === null) {
      return true;
    }

    return routeIntersectsBounds(
      section,
      visibilityBounds
    );
  });
}

export function getSourceBounds(source) {
  if (!source?.bounds) {
    return null;
  }

  return L.latLngBounds(
    [source.bounds.south, source.bounds.west],
    [source.bounds.north, source.bounds.east]
  );
}
