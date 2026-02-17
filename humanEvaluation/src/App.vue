<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import Tabs from "./components/Tabs.vue";
import CaseNav from "./components/CaseNav.vue";
import HallucinationTab from "./components/HallucinationTab.vue";
import HumanValidityTab, {
  type ReportAudit,
} from "./components/HumanValidityTab.vue";

type HallucinationType =
  | "typeI"
  | "typeII"
  | "typeIII"
  | "misclassification"
  | "none";
type TabId = "human-validity" | "llm-audit";

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

type HumanValidityAnnotation = {
  selectedId: string | null;
  model1: ReportAudit;
  model2: ReportAudit;
};
type HallucinationEntry = { type: HallucinationType | null; notes: string };
type HallucinationAnnotation = { model1: HallucinationEntry; model2: HallucinationEntry };

const defaultReportAudit = (): ReportAudit => ({
  validity: null,
  issueType: null,
  severity: null,
  editDistance: null,
});

const prismCases = ref<SingleModelCase[]>([]);
const sfCases = ref<SingleModelCase[]>([]);
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

const activeTab = ref<TabId>("human-validity");
const activeCaseIdByTab = ref<Record<TabId, string>>({
  "human-validity": "",
  "llm-audit": "",
});

const tabs = [
  { id: "human-validity", label: "Human validity scoring of AI-generated reports" },
  { id: "llm-audit", label: "LLM-as-evaluator auditing" },
] as const;

const baseUrl = import.meta.env.BASE_URL || "/";
const rawTilesBaseUrl = (import.meta.env.VITE_TILES_BASE_URL as string | undefined) ?? "";
const normalizedTilesBaseUrl = rawTilesBaseUrl.replace(/\/$/, "");
const tilesBaseUrl = rawTilesBaseUrl
  ? normalizedTilesBaseUrl.endsWith("/wsi")
    ? normalizedTilesBaseUrl
    : `${normalizedTilesBaseUrl}/wsi`
  : `${baseUrl}wsi`;

const activeCases = computed(() => pairedCases.value);

const activeCaseId = computed(() => activeCaseIdByTab.value[activeTab.value]);
const caseIndex = computed(() => activeCases.value.findIndex((c) => c.id === activeCaseId.value));
const currentCase = computed(() => activeCases.value[caseIndex.value] ?? null);

const currentHumanValidityCase = computed(
  () => pairedCases.value.find((c) => c.id === activeCaseIdByTab.value["human-validity"]) ?? null
);
const currentHallucinationCase = computed(
  () => pairedCases.value.find((c) => c.id === activeCaseIdByTab.value["llm-audit"]) ?? null
);

const disablePrev = computed(() => caseIndex.value <= 0);
const humanValidity = ref<Record<string, HumanValidityAnnotation>>({});
const hallucinationCheck = ref<Record<string, HallucinationAnnotation>>({});

function isReportAuditComplete(audit: ReportAudit | undefined) {
  if (!audit) return false;
  return !!audit.validity && !!audit.issueType && !!audit.severity && !!audit.editDistance;
}

const activeValidationReady = computed(() => {
  const activeId = activeCaseId.value;
  if (!activeId) return false;
  if (activeTab.value === "human-validity") {
    const entry = humanValidity.value[activeId];
    if (!entry?.selectedId) return false;
    return isReportAuditComplete(entry.model1) && isReportAuditComplete(entry.model2);
  }
  const entry = hallucinationCheck.value[activeId];
  if (!entry) return false;
  return !!entry.model1.type && !!entry.model2.type;
});

const disableNext = computed(() => {
  if (caseIndex.value >= activeCases.value.length - 1) {
    if (activeTab.value === "llm-audit") return true;
    return !activeValidationReady.value;
  }
  return !activeValidationReady.value;
});

const progressPercent = computed(() => {
  const total = pairedCases.value.length * 2;
  if (total === 0) return 0;
  let completed = 0;

  for (const c of pairedCases.value) {
    const entry = humanValidity.value[c.id];
    if (entry?.selectedId && isReportAuditComplete(entry.model1) && isReportAuditComplete(entry.model2)) {
      completed += 1;
    }
  }
  for (const c of pairedCases.value) {
    const entry = hallucinationCheck.value[c.id];
    if (entry?.model1.type && entry?.model2.type) completed += 1;
  }

  return Math.round((completed / total) * 100);
});

const allTasksComplete = computed(() => {
  if (pairedCases.value.length === 0) return false;

  for (const c of pairedCases.value) {
    const hv = humanValidity.value[c.id];
    if (!hv?.selectedId || !isReportAuditComplete(hv.model1) || !isReportAuditComplete(hv.model2)) return false;

    const hc = hallucinationCheck.value[c.id];
    if (!hc?.model1.type || !hc.model2.type) return false;
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
  if (activeTab.value === "human-validity") {
    activeTab.value = "llm-audit";
    if (!activeCaseIdByTab.value["llm-audit"] && pairedCases.value.length > 0) {
      activeCaseIdByTab.value["llm-audit"] = pairedCases.value[0]?.id ?? "";
    }
  }
}

function setCase(id: string) {
  activeCaseIdByTab.value[activeTab.value] = id;
}

type PersistedState = {
  activeTab: TabId;
  activeCaseIdByTab: Record<TabId, string>;
  humanValidity: Record<string, HumanValidityAnnotation>;
  hallucinationCheck: Record<string, HallucinationAnnotation>;
  autoExported: boolean;
};

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

function normalizeHumanValidityState(
  payload: Record<string, HumanValidityAnnotation> | undefined
): Record<string, HumanValidityAnnotation> {
  if (!payload) return {};
  const normalized: Record<string, HumanValidityAnnotation> = {};
  for (const [caseId, entry] of Object.entries(payload)) {
    normalized[caseId] = {
      selectedId: (entry as any)?.selectedId ?? null,
      model1: {
        ...defaultReportAudit(),
        ...((entry as any)?.model1 ?? {}),
      },
      model2: {
        ...defaultReportAudit(),
        ...((entry as any)?.model2 ?? {}),
      },
    };
  }
  return normalized;
}

function ensureHumanValidityState(caseId: string) {
  if (!humanValidity.value[caseId]) {
    humanValidity.value[caseId] = {
      selectedId: null,
      model1: defaultReportAudit(),
      model2: defaultReportAudit(),
    };
  }
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
  if (activeTab.value === "human-validity") ensureHumanValidityState(id);
  else ensureHallucinationState(id);
}

function updateHumanBestSelected(v: string | null) {
  const c = currentHumanValidityCase.value;
  if (!c) return;
  ensureHumanValidityState(c.id);
  const entry = humanValidity.value[c.id];
  if (!entry) return;
  entry.selectedId = v;
}

function updateHumanModel1Audit(v: ReportAudit) {
  const c = currentHumanValidityCase.value;
  if (!c) return;
  ensureHumanValidityState(c.id);
  const entry = humanValidity.value[c.id];
  if (!entry) return;
  entry.model1 = v;
}

function updateHumanModel2Audit(v: ReportAudit) {
  const c = currentHumanValidityCase.value;
  if (!c) return;
  ensureHumanValidityState(c.id);
  const entry = humanValidity.value[c.id];
  if (!entry) return;
  entry.model2 = v;
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

const STORAGE_KEY = "human-eval-state-v2";

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
    humanValidity: humanValidity.value,
    hallucinationCheck: hallucinationCheck.value,
    autoExported: autoExported.value,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save progress", err);
  }
}

onMounted(() => {
  const casesPromise = fetch(`${tilesBaseUrl}/cases_by_model.json`).then((r) => r.json());

  casesPromise
    .then((payload: { mod1: RawSingleCase[]; mod2: RawSingleCase[] }) => {
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

      const saved = loadState();
      if (saved) {
        humanValidity.value = normalizeHumanValidityState(saved.humanValidity);
        hallucinationCheck.value = normalizeHallucinationState(saved.hallucinationCheck);
        autoExported.value = saved.autoExported ?? false;

        const hasHvId = pairedCases.value.some((c) => c.id === saved.activeCaseIdByTab?.["human-validity"]);
        const hasAuditId = pairedCases.value.some((c) => c.id === saved.activeCaseIdByTab?.["llm-audit"]);

        activeTab.value = saved.activeTab ?? "human-validity";
        activeCaseIdByTab.value["human-validity"] = hasHvId
          ? saved.activeCaseIdByTab["human-validity"]
          : pairedCases.value[0]?.id ?? "";
        activeCaseIdByTab.value["llm-audit"] = hasAuditId
          ? saved.activeCaseIdByTab["llm-audit"]
          : pairedCases.value[0]?.id ?? "";
      } else {
        activeCaseIdByTab.value["human-validity"] = pairedCases.value[0]?.id ?? "";
        activeCaseIdByTab.value["llm-audit"] = pairedCases.value[0]?.id ?? "";
      }

      if (activeCaseIdByTab.value["human-validity"]) ensureHumanValidityState(activeCaseIdByTab.value["human-validity"]);
      if (activeCaseIdByTab.value["llm-audit"]) ensureHallucinationState(activeCaseIdByTab.value["llm-audit"]);
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
    pairedCases: pairedCases.value.map((c) => ({
      id: c.id,
      label: c.label,
      humanValidity: humanValidity.value[c.id] ?? {
        selectedId: null,
        model1: defaultReportAudit(),
        model2: defaultReportAudit(),
      },
      llmAsEvaluatorAuditing: hallucinationCheck.value[c.id] ?? {
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
  [humanValidity, hallucinationCheck, activeTab, activeCaseIdByTab, autoExported],
  () => saveState(),
  { deep: true }
);

const currentReportsForHumanValidity = computed<
  { id: "model1" | "model2"; name: string; text: string }[]
>(() => {
  const c = currentHumanValidityCase.value;
  if (!c) return [];
  return [
    { id: "model1", name: "Model 1", text: c.model1.report },
    { id: "model2", name: "Model 2", text: c.model2.report },
  ];
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
  <div class="h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-sky-50 via-blue-50 to-purple-50 text-slate-900">
    <header class="flex-shrink-0 border-b border-blue-100/70 px-6 py-2">
      <h1 class="text-base md:text-lg font-bold text-center tracking-tight text-slate-900">
        Pathologist Evaluation Interface
      </h1>
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

    <main class="flex-1 min-h-0 overflow-hidden px-4 md:px-6 py-4">
      <div v-if="currentCase" class="h-full min-h-0 flex flex-col">
        <div class="hidden">
          {{ ensureActiveState() }}
        </div>

        <div class="flex-1 min-h-0 overflow-hidden">
          <Tabs v-model="activeTab" :tabs="tabs">
            <HumanValidityTab
              v-if="activeTab === 'human-validity'"
              :reports="currentReportsForHumanValidity"
              :caseLabel="currentHumanValidityCase?.label || ''"
              :wsiDziUrl="currentHumanValidityCase?.model1.wsiDziUrl || ''"
              :groundTruth="currentHumanValidityCase?.model1.answer || ''"
              :selectedId="humanValidity[currentHumanValidityCase?.id ?? '']?.selectedId ?? null"
              :model1Audit="humanValidity[currentHumanValidityCase?.id ?? '']?.model1 ?? defaultReportAudit()"
              :model2Audit="humanValidity[currentHumanValidityCase?.id ?? '']?.model2 ?? defaultReportAudit()"
              @update:selectedId="updateHumanBestSelected"
              @update:model1Audit="updateHumanModel1Audit"
              @update:model2Audit="updateHumanModel2Audit"
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

      </div>

      <div v-else class="h-full flex items-center justify-center text-slate-400">
        No cases loaded.
      </div>
    </main>
  </div>
</template>
