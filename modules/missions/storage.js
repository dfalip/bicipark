const STORAGE_PREFIX = "bicipark.missions.v1";

function storageKey(missionId) {
  return `${STORAGE_PREFIX}.${missionId}`;
}

export function createInitialProgress(missionId) {
  return {
    missionId,
    status: "idle",
    startedAt: null,
    stoppedAt: null,
    completedAt: null,
    unlockedCheckpointIds: [],
    nextCheckpointIndex: 0,
    candidateReadings: 0,
    validGpsSamples: 0,
    routeMatchedSamples: 0,
    lastCheckpointAt: null,
    rewardUnlocked: false
  };
}

export function loadProgress(missionId) {
  try {
    const rawProgress = window.localStorage.getItem(storageKey(missionId));

    if (!rawProgress) {
      return createInitialProgress(missionId);
    }

    return {
      ...createInitialProgress(missionId),
      ...JSON.parse(rawProgress),
      missionId
    };
  } catch (error) {
    console.warn("No s'ha pogut llegir el progrés local.", error);
    return createInitialProgress(missionId);
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(
      storageKey(progress.missionId),
      JSON.stringify(progress)
    );
  } catch (error) {
    console.warn("No s'ha pogut desar el progrés local.", error);
  }
}

export function clearProgress(missionId) {
  try {
    window.localStorage.removeItem(storageKey(missionId));
  } catch (error) {
    console.warn("No s'ha pogut eliminar el progrés local.", error);
  }
}
