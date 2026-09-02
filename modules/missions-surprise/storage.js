const PREFIX = "bicipark.missions-surprise.v1";

function key(missionId) {
  return `${PREFIX}.${missionId}`;
}

export function initialProgress(missionId) {
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
    secretRewardCheckpointId: null,
    rewardCheckpointReached: false,
    rewardUnlocked: false,
    rewardUnlockedAt: null
  };
}

export function loadProgress(missionId) {
  try {
    const raw = localStorage.getItem(key(missionId));

    return raw
      ? { ...initialProgress(missionId), ...JSON.parse(raw), missionId }
      : initialProgress(missionId);
  } catch (error) {
    console.warn("No s'ha pogut llegir el progrés.", error);
    return initialProgress(missionId);
  }
}

export function saveProgress(progress) {
  localStorage.setItem(key(progress.missionId), JSON.stringify(progress));
}

export function clearProgress(missionId) {
  localStorage.removeItem(key(missionId));
}
