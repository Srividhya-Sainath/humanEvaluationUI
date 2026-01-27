<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import Tabs from "./components/Tabs.vue";
import CaseNav from "./components/CaseNav.vue";
import ValidationTab from "./components/ValidationTab.vue";
import BestReportTab from "./components/BestReportTab.vue";
import HallucinationTab from "./components/HallucinationTab.vue";

type Rating = "totally" | "partially" | "incorrect" | "indeterminate";
type StyleRating = "1" | "2" | "3" | "4" | "5";
type HallucinationType =
  | "typeI"
  | "typeII"
  | "typeIII"
  | "misclassification"
  | "none";
type TabId = "val-m1" | "val-m2" | "best" | "hallucination";

type CaseReport = {
  sourceId: string;
  sourceModel: string;
  report: string;
  wsiDziUrl: string;
  answer: string;
};

type SingleModelCase = {
  id: string;
  label: string;
  model: CaseReport;
};

type PairedCase = {
  id: string;
  label: string;
  model1: CaseReport;
  model2: CaseReport;
};

type RawSingleCase = {
  id: string;
  label: string;
  model: { source_id: string; report: string; answer?: string };
};

const prismCases = ref<SingleModelCase[]>([]);
const sfCases = ref<SingleModelCase[]>([]);
const medGemmaReports = ref<Record<string, string>>({});
const pairedCases = computed<PairedCase[]>(() => {
  const total = Math.min(prismCases.value.length, sfCases.value.length);
  const pairs: PairedCase[] = [];
  for (let index = 0; index < total; index += 1) {
    const model1Case = prismCases.value[index];
    const model2Case = sfCases.value[index];
    if (!model1Case || !model2Case) continue;
    const num = String(index + 1).padStart(3, "0");
    pairs.push({
      id: `pair-${num}`,
      label: `Case ${num}`,
      model1: model1Case.model,
      model2: model2Case.model,
    });
  }
  return pairs;
});

const isIncorrect = (answer: string) => answer.trim().toUpperCase() === "IC";
const filteredPairedCases = computed(() =>
  pairedCases.value.filter(
    (c) => !isIncorrect(c.model1.answer) && !isIncorrect(c.model2.answer)
  )
);

const activeTab = ref<TabId>("val-m1");
const activeCaseIdByTab = ref<Record<TabId, string>>({
  "val-m1": "",
  "val-m2": "",
  best: "",
  hallucination: "",
});

const tabs = [
  { id: "val-m1", label: "Pathology Report Rating (Model 1)" },
  { id: "val-m2", label: "Pathology Report Rating (Model 2)" },
  { id: "best", label: "Pick The Best Report" },
  { id: "hallucination", label: "Hallucination Check" },
] as const;

const baseUrl = import.meta.env.BASE_URL || "/";
const rawTilesBaseUrl = (import.meta.env.VITE_TILES_BASE_URL as string | undefined) ?? "";
const normalizedTilesBaseUrl = rawTilesBaseUrl.replace(/\/$/, "");
const tilesBaseUrl = rawTilesBaseUrl
  ? normalizedTilesBaseUrl.endsWith("/wsi")
    ? normalizedTilesBaseUrl
    : `${normalizedTilesBaseUrl}/wsi`
  : `${baseUrl}wsi`;

const activeCases = computed(() => {
  if (activeTab.value === "val-m1") return prismCases.value;
  if (activeTab.value === "val-m2") return sfCases.value;
  if (activeTab.value === "best") return filteredPairedCases.value;
  return pairedCases.value;
});

const activeCaseId = computed(() => activeCaseIdByTab.value[activeTab.value]);
const caseIndex = computed(() => activeCases.value.findIndex((c) => c.id === activeCaseId.value));
const currentCase = computed(() => activeCases.value[caseIndex.value] ?? null);

const currentPrismCase = computed(() => prismCases.value.find((c) => c.id === activeCaseIdByTab.value["val-m1"]) ?? null);
const currentSfCase = computed(() => sfCases.value.find((c) => c.id === activeCaseIdByTab.value["val-m2"]) ?? null);
const currentPairCase = computed(() => filteredPairedCases.value.find((c) => c.id === activeCaseIdByTab.value.best) ?? null);
const currentHallucinationCase = computed(
  () => pairedCases.value.find((c) => c.id === activeCaseIdByTab.value.hallucination) ?? null
);

const disablePrev = computed(() => caseIndex.value <= 0);
const activeValidationReady = computed(() => {
  const activeId = activeCaseId.value;
  if (!activeId) return false;
  if (activeTab.value === "val-m1") {
    const entry = valModel1.value[activeId];
    if (!entry) return false;
    return (
      !!entry.rating &&
      !!entry.styleRating &&
      entry.correctnessJustification.trim().length > 0 &&
      entry.styleJustification.trim().length > 0
    );
  }
  if (activeTab.value === "val-m2") {
    const entry = valModel2.value[activeId];
    if (!entry) return false;
    return (
      !!entry.rating &&
      !!entry.styleRating &&
      entry.correctnessJustification.trim().length > 0 &&
      entry.styleJustification.trim().length > 0
    );
  }
  if (activeTab.value === "best") {
    const entry = bestPick.value[activeId];
    if (!entry) return false;
    return !!entry.selectedId && entry.justification.trim().length > 0;
  }
  const entry = hallucinationCheck.value[activeId];
  if (!entry) return false;
  return !!entry.model1.type && !!entry.model2.type;
});

const disableNext = computed(() => {
  if (caseIndex.value >= activeCases.value.length - 1) {
    if (activeTab.value === "hallucination") return true;
    return !activeValidationReady.value;
  }
  return !activeValidationReady.value;
});

const progressPercent = computed(() => {
  const total =
    prismCases.value.length +
    sfCases.value.length +
    filteredPairedCases.value.length +
    pairedCases.value.length;
  if (total === 0) return 0;
  let completed = 0;

  for (const c of prismCases.value) {
    const entry = valModel1.value[c.id];
    if (
      entry?.rating &&
      entry.styleRating &&
      entry.correctnessJustification.trim().length > 0 &&
      entry.styleJustification.trim().length > 0
    ) {
      completed += 1;
    }
  }
  for (const c of sfCases.value) {
    const entry = valModel2.value[c.id];
    if (
      entry?.rating &&
      entry.styleRating &&
      entry.correctnessJustification.trim().length > 0 &&
      entry.styleJustification.trim().length > 0
    ) {
      completed += 1;
    }
  }
  for (const c of filteredPairedCases.value) {
    const entry = bestPick.value[c.id];
    if (entry?.selectedId && entry.justification.trim().length > 0) completed += 1;
  }
  for (const c of pairedCases.value) {
    const entry = hallucinationCheck.value[c.id];
    if (entry?.model1.type && entry?.model2.type) completed += 1;
  }

  return Math.round((completed / total) * 100);
});
const allTasksComplete = computed(() => {
  if (prismCases.value.length === 0 || sfCases.value.length === 0) return false;

  for (const c of prismCases.value) {
    const entry = valModel1.value[c.id];
    if (
      !entry?.rating ||
      !entry.styleRating ||
      entry.correctnessJustification.trim().length === 0 ||
      entry.styleJustification.trim().length === 0
    ) {
      return false;
    }
  }
  for (const c of sfCases.value) {
    const entry = valModel2.value[c.id];
    if (
      !entry?.rating ||
      !entry.styleRating ||
      entry.correctnessJustification.trim().length === 0 ||
      entry.styleJustification.trim().length === 0
    ) {
      return false;
    }
  }
  for (const c of filteredPairedCases.value) {
    const entry = bestPick.value[c.id];
    if (!entry?.selectedId || entry.justification.trim().length === 0) return false;
  }
  for (const c of pairedCases.value) {
    const entry = hallucinationCheck.value[c.id];
    if (!entry?.model1.type || !entry?.model2.type) return false;
  }

  return true;
});
const autoExported = ref(false);

function prevCase() {
  if (disablePrev.value) return;
  const prev = activeCases.value[caseIndex.value - 1];
  if (prev) activeCaseIdByTab.value[activeTab.value] = prev.id;
}
function nextCase() {
  if (disableNext.value) return;
  const next = activeCases.value[caseIndex.value + 1];
  if (next) {
    activeCaseIdByTab.value[activeTab.value] = next.id;
    return;
  }
  if (activeTab.value === "val-m1") {
    activeTab.value = "val-m2";
    if (!activeCaseIdByTab.value["val-m2"] && sfCases.value.length > 0) {
      activeCaseIdByTab.value["val-m2"] = sfCases.value[0]?.id ?? "";
    }
    return;
  }
  if (activeTab.value === "val-m2") {
    activeTab.value = "best";
    if (!activeCaseIdByTab.value.best && filteredPairedCases.value.length > 0) {
      activeCaseIdByTab.value.best = filteredPairedCases.value[0]?.id ?? "";
    }
    return;
  }
  if (activeTab.value === "best") {
    activeTab.value = "hallucination";
    if (!activeCaseIdByTab.value.hallucination && pairedCases.value.length > 0) {
      activeCaseIdByTab.value.hallucination = pairedCases.value[0]?.id ?? "";
    }
  }
}
function setCase(id: string) {
  activeCaseIdByTab.value[activeTab.value] = id;
}

/**
 * Per-case annotations
 * - validation for model1 and model2 stored separately
 * - best report choice stored separately
 */
type ValidationAnnotation = {
  rating: Rating | null;
  correctnessJustification: string;
  styleJustification: string;
  styleRating: StyleRating | null;
};
type BestAnnotation = { selectedId: string | null; justification: string };
type HallucinationEntry = { type: HallucinationType | null; notes: string };
type HallucinationAnnotation = { model1: HallucinationEntry; model2: HallucinationEntry };

const valModel1 = ref<Record<string, ValidationAnnotation>>({});
const valModel2 = ref<Record<string, ValidationAnnotation>>({});
const bestPick = ref<Record<string, BestAnnotation>>({});
const hallucinationCheck = ref<Record<string, HallucinationAnnotation>>({});
const STORAGE_KEY = "human-eval-state-v1";

type PersistedState = {
  activeTab: TabId;
  activeCaseIdByTab: Record<TabId, string>;
  valModel1: Record<string, ValidationAnnotation>;
  valModel2: Record<string, ValidationAnnotation>;
  bestPick: Record<string, BestAnnotation>;
  hallucinationCheck: Record<string, HallucinationAnnotation>;
  autoExported: boolean;
};

function normalizeValidationState(
  payload: Record<string, ValidationAnnotation> | undefined
): Record<string, ValidationAnnotation> {
  if (!payload) return {};
  const normalized: Record<string, ValidationAnnotation> = {};
  for (const [caseId, entry] of Object.entries(payload)) {
    normalized[caseId] = {
      rating: entry?.rating ?? null,
      correctnessJustification: (entry as any)?.correctnessJustification ?? (entry as any)?.justification ?? "",
      styleJustification: (entry as any)?.styleJustification ?? "",
      styleRating: (entry as any)?.styleRating ?? null,
    };
  }
  return normalized;
}

function normalizeHallucinationState(
  payload: Record<string, HallucinationAnnotation> | undefined
): Record<string, HallucinationAnnotation> {
  if (!payload) return {};
  const normalized: Record<string, HallucinationAnnotation> = {};
  for (const [caseId, entry] of Object.entries(payload)) {
    normalized[caseId] = {
      model1: {
        type: (entry as any)?.model1?.type ?? null,
        notes: (entry as any)?.model1?.notes ?? "",
      },
      model2: {
        type: (entry as any)?.model2?.type ?? null,
        notes: (entry as any)?.model2?.notes ?? "",
      },
    };
  }
  return normalized;
}

function ensureCaseState(caseId: string) {
  if (!valModel1.value[caseId]) {
    valModel1.value[caseId] = {
      rating: null,
      correctnessJustification: "",
      styleJustification: "",
      styleRating: null,
    };
  }
  if (!valModel2.value[caseId]) {
    valModel2.value[caseId] = {
      rating: null,
      correctnessJustification: "",
      styleJustification: "",
      styleRating: null,
    };
  }
  if (!bestPick.value[caseId]) bestPick.value[caseId] = { selectedId: null, justification: "" };
}
function ensureHallucinationState(caseId: string) {
  if (!hallucinationCheck.value[caseId]) {
    hallucinationCheck.value[caseId] = {
      model1: { type: null, notes: "" },
      model2: { type: null, notes: "" },
    };
  }
}
function ensureActiveState() {
  const id = activeCaseId.value;
  if (!id) return;
  if (activeTab.value === "hallucination") {
    ensureHallucinationState(id);
    return;
  }
  ensureCaseState(id);
}

function updatePrismRating(v: Rating | null) {
  const c = currentPrismCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel1.value[c.id];
  if (!entry) return;
  entry.rating = v;
}
function updatePrismCorrectnessJustification(v: string) {
  const c = currentPrismCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel1.value[c.id];
  if (!entry) return;
  entry.correctnessJustification = v;
}
function updateSfRating(v: Rating | null) {
  const c = currentSfCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel2.value[c.id];
  if (!entry) return;
  entry.rating = v;
}
function updateSfCorrectnessJustification(v: string) {
  const c = currentSfCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel2.value[c.id];
  if (!entry) return;
  entry.correctnessJustification = v;
}
function updatePrismStyleJustification(v: string) {
  const c = currentPrismCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel1.value[c.id];
  if (!entry) return;
  entry.styleJustification = v;
}
function updateSfStyleJustification(v: string) {
  const c = currentSfCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel2.value[c.id];
  if (!entry) return;
  entry.styleJustification = v;
}
function updatePrismStyleRating(v: StyleRating | null) {
  const c = currentPrismCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel1.value[c.id];
  if (!entry) return;
  entry.styleRating = v;
}
function updateSfStyleRating(v: StyleRating | null) {
  const c = currentSfCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = valModel2.value[c.id];
  if (!entry) return;
  entry.styleRating = v;
}
function updateHallucinationType(modelId: "model1" | "model2", v: HallucinationType | null) {
  const c = currentHallucinationCase.value;
  if (!c) return;
  ensureHallucinationState(c.id);
  const entry = hallucinationCheck.value[c.id];
  if (!entry) return;
  entry[modelId].type = v;
}
function updateHallucinationNotes(modelId: "model1" | "model2", v: string) {
  const c = currentHallucinationCase.value;
  if (!c) return;
  ensureHallucinationState(c.id);
  const entry = hallucinationCheck.value[c.id];
  if (!entry) return;
  entry[modelId].notes = v;
}
function updateBestSelected(v: string | null) {
  const c = currentPairCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = bestPick.value[c.id];
  if (!entry) return;
  entry.selectedId = v;
}
function updateBestJustification(v: string) {
  const c = currentPairCase.value;
  if (!c) return;
  ensureCaseState(c.id);
  const entry = bestPick.value[c.id];
  if (!entry) return;
  entry.justification = v;
}

function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch (err) {
    console.warn("Failed to load saved progress", err);
    return null;
  }
}

function saveState() {
  const payload: PersistedState = {
    activeTab: activeTab.value,
    activeCaseIdByTab: activeCaseIdByTab.value,
    valModel1: valModel1.value,
    valModel2: valModel2.value,
    bestPick: bestPick.value,
    hallucinationCheck: hallucinationCheck.value,
    autoExported: autoExported.value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save progress", err);
  }
}

// keep state initialized for the active case
onMounted(() => {
  const casesPromise = fetch(`${tilesBaseUrl}/cases_by_model.json`).then((r) => r.json());
  const medGemmaPromise = fetch(`${tilesBaseUrl}/medGemma.json`)
    .then((r) => r.json())
    .catch((err) => {
      console.error("Failed to load medGemma.json", err);
      return {};
    });

  Promise.all([casesPromise, medGemmaPromise])
    .then(([payload, medGemmaPayload]: [{ mod1: RawSingleCase[]; mod2: RawSingleCase[] }, Record<string, string>]) => {
      const mapOne = (c: RawSingleCase): SingleModelCase => ({
        id: c.id,
        label: c.label,
        model: {
          sourceId: c.model.source_id,
          sourceModel: "",
          report: c.model.report,
          wsiDziUrl: `${tilesBaseUrl}/tiles/${c.model.source_id}.dzi`,
          answer: c.model.answer ?? "",
        },
      });

      prismCases.value = payload.mod1.map(mapOne);
      sfCases.value = payload.mod2.map(mapOne);
      medGemmaReports.value = medGemmaPayload ?? {};

      const saved = loadState();
      if (saved) {
        valModel1.value = normalizeValidationState(saved.valModel1);
        valModel2.value = normalizeValidationState(saved.valModel2);
        bestPick.value = saved.bestPick ?? {};
        hallucinationCheck.value = normalizeHallucinationState(saved.hallucinationCheck);
        autoExported.value = saved.autoExported ?? false;

        const hasPrismId = prismCases.value.some((c) => c.id === saved.activeCaseIdByTab?.["val-m1"]);
        const hasSfId = sfCases.value.some((c) => c.id === saved.activeCaseIdByTab?.["val-m2"]);
        const hasBestId = filteredPairedCases.value.some((c) => c.id === saved.activeCaseIdByTab?.best);
        const hasHallucinationId = pairedCases.value.some((c) => c.id === saved.activeCaseIdByTab?.hallucination);

        activeTab.value = saved.activeTab ?? "val-m1";
        activeCaseIdByTab.value["val-m1"] = hasPrismId ? saved.activeCaseIdByTab["val-m1"] : prismCases.value[0]?.id ?? "";
        activeCaseIdByTab.value["val-m2"] = hasSfId ? saved.activeCaseIdByTab["val-m2"] : sfCases.value[0]?.id ?? "";
        activeCaseIdByTab.value.best = hasBestId ? saved.activeCaseIdByTab.best : filteredPairedCases.value[0]?.id ?? "";
        activeCaseIdByTab.value.hallucination = hasHallucinationId
          ? saved.activeCaseIdByTab.hallucination
          : pairedCases.value[0]?.id ?? "";
      } else {
        activeCaseIdByTab.value["val-m1"] = prismCases.value[0]?.id ?? "";
        activeCaseIdByTab.value["val-m2"] = sfCases.value[0]?.id ?? "";
        activeCaseIdByTab.value.best = filteredPairedCases.value[0]?.id ?? "";
        activeCaseIdByTab.value.hallucination = pairedCases.value[0]?.id ?? "";
      }

      if (activeCaseIdByTab.value["val-m1"]) ensureCaseState(activeCaseIdByTab.value["val-m1"]);
      if (activeCaseIdByTab.value["val-m2"]) ensureCaseState(activeCaseIdByTab.value["val-m2"]);
      if (activeCaseIdByTab.value.best) ensureCaseState(activeCaseIdByTab.value.best);
      if (activeCaseIdByTab.value.hallucination) ensureHallucinationState(activeCaseIdByTab.value.hallucination);
      if (allTasksComplete.value) autoExported.value = true;
    })
    .catch((err) => {
      console.error("Failed to load cases_by_model.json", err);
    });
  window.addEventListener("keydown", handleKeydown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  // Don’t hijack keys while typing
  const t = e.target as HTMLElement | null;
  if (
    t instanceof HTMLInputElement ||
    t instanceof HTMLTextAreaElement ||
    t instanceof HTMLSelectElement ||
    (t && (t as any).isContentEditable)
  ) {
    return;
  }

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    prevCase();
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    nextCase();
  }
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    prismCases: prismCases.value.map((c) => ({
      id: c.id,
      label: c.label,
      validationModel1: valModel1.value[c.id] ?? {
        rating: null,
        correctnessJustification: "",
        styleJustification: "",
        styleRating: null,
      },
    })),
    sfCases: sfCases.value.map((c) => ({
      id: c.id,
      label: c.label,
      validationModel2: valModel2.value[c.id] ?? {
        rating: null,
        correctnessJustification: "",
        styleJustification: "",
        styleRating: null,
      },
    })),
    pairedCases: pairedCases.value.map((c) => ({
      id: c.id,
      label: c.label,
      bestReport: bestPick.value[c.id] ?? { selectedId: null, justification: "" },
      hallucinationCheck: hallucinationCheck.value[c.id] ?? {
        model1: { type: null, notes: "" },
        model2: { type: null, notes: "" },
      },
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `human-eval-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
watch(allTasksComplete, (done) => {
  if (!done || autoExported.value) return;
  autoExported.value = true;
  exportJson();
});
watch(
  [valModel1, valModel2, bestPick, hallucinationCheck, activeTab, activeCaseIdByTab, autoExported],
  () => saveState(),
  { deep: true }
);

const currentReportsForBest = computed(() => {
  const c = currentPairCase.value;
  if (!c) return [];
  const model3Text = medGemmaReports.value[c.model1.sourceId] ?? "";
  const reports = [
    { id: "model1", name: "Model 1", tag: "", text: c.model1.report },
    { id: "model2", name: "Model 2", tag: "", text: c.model2.report },
    { id: "model3", name: "Model 3", tag: "", text: model3Text },
  ];
  return reports;
});
const currentReportsForHallucination = computed<
  { id: "model1" | "model2"; name: string; text: string }[]
>(() => {
  const c = currentHallucinationCase.value;
  if (!c) return [];
  return [
    { id: "model1", name: "Model 1", text: c.model1.report },
    { id: "model2", name: "Model 2", text: c.model2.report },
  ];
});
</script>

<template>
  <div class="min-h-screen w-screen flex flex-col bg-gradient-to-br from-sky-50 via-blue-50 to-purple-50 text-slate-900">
    <header class="flex-shrink-0 border-b border-blue-100/70 px-6 py-4">
      <h1 class="text-xl md:text-2xl font-extrabold text-center tracking-tight text-slate-900">
        Human Evaluation UI
      </h1>
      <p class="text-xs text-slate-500 text-center mt-1">
        Rate each report, add brief justifications, then click Next to move to the next case. When you finish all tasks,
        download your JSON.
      </p>
    </header>

    <div class="flex-shrink-0 px-4 md:px-6 py-3 border-b border-slate-900/70">
      <CaseNav
        :cases="activeCases.map(c => ({ id: c.id, label: c.label }))"
        :activeCaseId="activeCaseId"
        :index="caseIndex"
        :disablePrev="disablePrev"
        :disableNext="disableNext"
        :progressPercent="progressPercent"
        @prev="prevCase"
        @next="nextCase"
        @set="setCase"
        @export="exportJson"
      />
    </div>

    <main class="flex-1 px-4 md:px-6 py-4">
      <div v-if="currentCase" class="flex flex-col">
        <!-- ensure state exists -->
        <div class="hidden">
          {{ ensureActiveState() }}
        </div>

        <div>
          <Tabs v-model="activeTab" :tabs="tabs">
            <ValidationTab
              v-if="activeTab === 'val-m1'"
              :title="`Pathology Report Rating (Model 1)`"
              modelLabel="Model 1"
              :reportText="currentPrismCase?.model.report || ''"
              :caseLabel="currentPrismCase?.label || ''"
              :wsiDziUrl="currentPrismCase?.model.wsiDziUrl || ''"
              :modelValueRating="valModel1[currentPrismCase?.id ?? '']?.rating ?? null"
              :modelValueCorrectnessJustification="valModel1[currentPrismCase?.id ?? '']?.correctnessJustification ?? ''"
              :modelValueStyleJustification="valModel1[currentPrismCase?.id ?? '']?.styleJustification ?? ''"
              :modelValueStyleRating="valModel1[currentPrismCase?.id ?? '']?.styleRating ?? null"
              @update:rating="updatePrismRating"
              @update:correctnessJustification="updatePrismCorrectnessJustification"
              @update:styleJustification="updatePrismStyleJustification"
              @update:styleRating="updatePrismStyleRating"
            />

            <ValidationTab
              v-else-if="activeTab === 'val-m2'"
              :title="`Pathology Report Rating (Model 2)`"
              modelLabel="Model 2"
              :reportText="currentSfCase?.model.report || ''"
              :caseLabel="currentSfCase?.label || ''"
              :wsiDziUrl="currentSfCase?.model.wsiDziUrl || ''"
              :modelValueRating="valModel2[currentSfCase?.id ?? '']?.rating ?? null"
              :modelValueCorrectnessJustification="valModel2[currentSfCase?.id ?? '']?.correctnessJustification ?? ''"
              :modelValueStyleJustification="valModel2[currentSfCase?.id ?? '']?.styleJustification ?? ''"
              :modelValueStyleRating="valModel2[currentSfCase?.id ?? '']?.styleRating ?? null"
              @update:rating="updateSfRating"
              @update:correctnessJustification="updateSfCorrectnessJustification"
              @update:styleJustification="updateSfStyleJustification"
              @update:styleRating="updateSfStyleRating"
            />

            <BestReportTab
              v-else-if="activeTab === 'best'"
              :reports="currentReportsForBest"
              :caseLabel="currentPairCase?.label || ''"
              :wsiDziUrl="currentPairCase?.model1.wsiDziUrl || ''"
              :selectedId="bestPick[currentPairCase?.id ?? '']?.selectedId ?? null"
              :justification="bestPick[currentPairCase?.id ?? '']?.justification ?? ''"
              @update:selectedId="updateBestSelected"
              @update:justification="updateBestJustification"
            />

            <HallucinationTab
              v-else
              :reports="currentReportsForHallucination"
              :caseLabel="currentHallucinationCase?.label || ''"
              :wsiDziUrl="currentHallucinationCase?.model1.wsiDziUrl || ''"
              :model1Type="hallucinationCheck[currentHallucinationCase?.id ?? '']?.model1.type ?? null"
              :model2Type="hallucinationCheck[currentHallucinationCase?.id ?? '']?.model2.type ?? null"
              :model1Notes="hallucinationCheck[currentHallucinationCase?.id ?? '']?.model1.notes ?? ''"
              :model2Notes="hallucinationCheck[currentHallucinationCase?.id ?? '']?.model2.notes ?? ''"
              @update:model1Type="(v) => updateHallucinationType('model1', v)"
              @update:model2Type="(v) => updateHallucinationType('model2', v)"
              @update:model1Notes="(v) => updateHallucinationNotes('model1', v)"
              @update:model2Notes="(v) => updateHallucinationNotes('model2', v)"
            />
          </Tabs>
        </div>

        <div class="mt-4 flex items-center justify-between">
          <button
            type="button"
            class="px-5 py-2 rounded-full border border-sky-200/70 bg-sky-200/90 text-slate-900 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            @click="prevCase"
            :disabled="disablePrev"
            :class="disablePrev ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-sm' : ''"
            title="Previous case (←)"
          >
            <img :src="`${tilesBaseUrl}/image.png`" alt="Previous" class="h-5 w-5 inline-block -scale-x-100" />
          </button>
          <button
            type="button"
            class="px-5 py-2 rounded-full border border-sky-200/70 bg-sky-200/90 text-slate-900 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            @click="nextCase"
            :disabled="disableNext"
            :class="disableNext ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-sm' : ''"
            title="Next case (→)"
          >
            <img :src="`${tilesBaseUrl}/image.png`" alt="Next" class="h-5 w-5 inline-block" />
          </button>
        </div>
      </div>

      <div v-else class="h-full flex items-center justify-center text-slate-400">
        No cases loaded.
      </div>
    </main>
  </div>
</template>
