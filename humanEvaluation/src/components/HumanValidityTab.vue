<template>
  <div
    v-if="showIntro"
    class="h-full min-h-0 border border-sky-200 bg-white p-4 overflow-y-auto"
  >
    <h2 class="text-sm md:text-base font-semibold text-slate-900">Welcome: Pathologist Evaluation Context</h2>
    <p class="mt-2 text-xs text-slate-700">
      You will evaluate AI-generated pathology reports against the displayed WSI.
      Complete the five tasks in order for each case.
    </p>
    <div class="mt-3 text-xs text-slate-700 space-y-1">
      <p><span class="font-semibold">1)</span> Pick the most clinically usable report.</p>
      <p><span class="font-semibold">2)</span> Assess Diagnostic Validity.</p>
      <p><span class="font-semibold">3)</span> Assess Hallucination content.</p>
      <p><span class="font-semibold">4)</span> Rate Severity of issues.</p>
      <p><span class="font-semibold">5)</span> Estimate Minimal-edit distance to a signable report.</p>
    </div>
    <p class="mt-3 text-xs text-slate-600">
      Your selections are autosaved per case. Use the stepper to track completion.
    </p>
    <button
      type="button"
      class="mt-4 px-3 py-2 border border-sky-300 bg-sky-100 text-slate-900 text-xs font-semibold"
      @click="showIntro = false"
    >
      Start Evaluation
    </button>
  </div>

  <div v-else class="h-full min-h-0 overflow-auto xl:overflow-hidden grid grid-cols-1 xl:grid-cols-2 gap-2">
    <div class="xl:col-span-2 sticky top-0 z-20 border border-sky-200 bg-white/95 backdrop-blur-sm p-2">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-1.5 text-xs">
        <div class="step-chip" :class="stepClass(isPickComplete)">1) Pick the most clinically usable report</div>
        <div class="step-chip" :class="stepClass(isDiagnosticComplete)">2) Diagnostic Validity</div>
        <div class="step-chip" :class="stepClass(isHallucinationComplete)">3) Hallucination Assessment</div>
        <div class="step-chip" :class="stepClass(isSeverityComplete)">4) Severity Assessment</div>
        <div class="step-chip" :class="stepClass(isEditDistanceComplete)">5) Minimal-edit distance</div>
      </div>
      <p class="mt-1 text-xs text-slate-600">Next required action: <span class="font-semibold">{{ nextActionLabel }}</span></p>
    </div>

    <div class="min-h-0 flex flex-col gap-2">
      <section
        class="rounded-none border p-2.5 min-h-0 flex flex-col xl:h-[360px] transition-all"
        :class="sectionStateClass(true)"
      >
        <div class="flex-1 min-h-0 rounded-none border border-sky-200 bg-white overflow-hidden">
          <WsiViewer :dziUrl="wsiDziUrl" />
        </div>
      </section>

      <section
        class="rounded-none border p-2.5 min-h-0 flex-1 flex flex-col overflow-hidden transition-all"
        :class="sectionStateClass(true)"
      >
        <h3 class="text-xs md:text-sm font-semibold text-slate-900">1) Pick the most clinically usable report</h3>
        <p class="mt-1.5 text-xs text-slate-600">
          <span class="rounded-none bg-emerald-100 px-1.5 py-0.5 text-emerald-900">Ground truth:</span>
          <span class="font-semibold text-slate-800 rounded-none bg-emerald-100 px-1.5 py-0.5 text-emerald-900">
            {{ groundTruth || "N/A" }}
          </span>
        </p>

        <div class="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="r in reports"
              :key="r.id"
              class="rounded-none border p-2.5 transition-all"
              :class="selectedId === r.id ? 'border-sky-300 bg-sky-100/70' : 'border-sky-200 bg-white'"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="text-xs font-bold uppercase tracking-wide text-slate-700">{{ r.name }}</div>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                  :class="selectedId === r.id
                    ? 'bg-sky-200 text-slate-900 border-sky-300'
                    : 'bg-sky-100 text-slate-700 border-sky-200'"
                  @click="$emit('update:selectedId', r.id)"
                >
                  {{ selectedId === r.id ? "Picked" : "Pick" }}
                </button>
              </div>

              <textarea
                readonly
                :rows="rowsForReport(r.text)"
                :value="r.text"
                class="mt-2 w-full rounded-none border border-sky-200 bg-sky-50/70 p-2.5 text-[13px] leading-relaxed text-slate-800 resize-none overflow-y-auto"
              />
            </div>
          </div>

          <button
            type="button"
            class="w-full mt-2 px-3 py-2 rounded-none text-xs font-semibold border transition-all text-left"
            :class="selectedId === 'none'
              ? 'bg-sky-200 text-slate-900 border-sky-300'
              : 'bg-sky-100 text-slate-700 border-sky-200'"
            @click="$emit('update:selectedId', 'none')"
          >
            None of the reports
          </button>
        </div>
      </section>
    </div>

    <div class="min-h-0 flex flex-col gap-2">
      <section
        ref="diagnosticBlockEl"
        class="rounded-none border p-2.5 min-h-0 flex-1 overflow-y-auto transition-all"
        :class="sectionStateClass(isPickComplete)"
      >
        <h3 class="task-title text-slate-900">2) Diagnostic Validity</h3>
        <p class="mt-1.5 text-xs text-slate-700 task-desc">
          Assess the clinical validity and diagnostic correctness of the report based on the provided slide. Would you sign
          this report in its current form?
        </p>
        <div class="mt-1.5 text-xs text-slate-600 space-y-0.5">
          <p><span class="font-semibold text-slate-700">ACCEPTABLE</span> - Diagnostically correct; only minor edits needed.</p>
          <p><span class="font-semibold text-slate-700">UNACCEPTABLE</span> - Major errors or clinically significant omissions.</p>
          <p><span class="font-semibold text-slate-700">UNCERTAIN</span> - Diagnosis unsupported, insufficient, or unsafe.</p>
        </div>

        <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="r in reports"
            :key="`diagnostic-${r.id}`"
            class="rounded-none border border-sky-200 bg-white p-2.5"
          >
            <div class="text-xs font-bold uppercase tracking-wide text-slate-700">{{ r.name }}</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="opt in validityOptions"
                :key="opt.value"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all text-left"
                :disabled="!isPickComplete"
                :class="currentAudit(r.id).validity === opt.value
                  ? 'bg-sky-200 text-slate-900 border-sky-300'
                  : 'bg-sky-100/70 text-slate-700 border-sky-200'"
                :title="!isPickComplete ? 'Complete step 1 first' : ''"
                @click="updateAudit(r.id, 'validity', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <h3 class="mt-3 task-title text-slate-900">3) Hallucination Assessment</h3>
        <p class="mt-1.5 text-xs text-slate-700 task-desc">
          Assess whether the report contains hallucinated content.
        </p>
        <p v-if="!isDiagnosticComplete" class="mt-1 text-xs text-amber-700">Complete Diagnostic Validity for both models to unlock this step.</p>
        <div class="mt-1.5 text-xs text-slate-600 space-y-0.5">
          <p>
            <span class="font-semibold text-slate-700">CONTEXT MISMATCH</span> - Incorrect tissue site or diagnosis,
            fabricated supporting features, or internal contradictions (e.g., multiple incompatible diagnoses in a single
            slide).
          </p>
          <p>
            <span class="font-semibold text-slate-700">CASE-LEVEL OVERREACH</span> - Mentions information not inferable from
            this slide (e.g., molecular biomarkers, lymph node status or multi-slide level information).
          </p>
          <p>
            <span class="font-semibold text-slate-700">NO HALLUCINATION</span> - No unsupported or fabricated content
            detected.
          </p>
        </div>

        <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="r in reports"
            :key="`hallucination-${r.id}`"
            class="rounded-none border border-sky-200 bg-white p-2.5"
          >
            <div class="text-xs font-bold uppercase tracking-wide text-slate-700">{{ r.name }}</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="opt in issueTypeOptions"
                :key="opt.value"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all text-left"
                :disabled="!isDiagnosticComplete"
                :class="currentAudit(r.id).issueType === opt.value
                  ? 'bg-sky-200 text-slate-900 border-sky-300'
                  : 'bg-sky-100/70 text-slate-700 border-sky-200'"
                :title="!isDiagnosticComplete ? 'Complete step 2 first' : ''"
                @click="updateAudit(r.id, 'issueType', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        ref="severityBlockEl"
        class="rounded-none border p-2.5 min-h-0 flex-1 overflow-y-auto transition-all"
        :class="sectionStateClass(isValidityAndHallucinationComplete)"
      >
        <h3 class="task-title text-slate-900">4) Severity Assessment</h3>
        <p class="mt-1.5 text-xs text-slate-700 task-desc">
          If an error or hallucination is present, rate its clinical severity.
        </p>
        <div class="mt-1.5 text-xs text-slate-600 space-y-0.5">
          <p><span class="font-semibold text-slate-700">NONE</span> - No clinically relevant issue.</p>
          <p><span class="font-semibold text-slate-700">MINOR</span> - Inaccuracy unlikely to affect diagnosis or patient management.</p>
          <p><span class="font-semibold text-slate-700">MAJOR</span> - Clinically significant error that could affect diagnosis, management, or patient safety.</p>
        </div>

        <p v-if="!isValidityAndHallucinationComplete" class="mt-1 text-xs text-amber-700">Complete steps 2 and 3 for both models to unlock this block.</p>

        <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="r in reports"
            :key="`${r.id}-severity`"
            class="rounded-none border border-sky-200 bg-white p-2.5"
          >
            <div class="text-xs font-bold uppercase tracking-wide text-slate-700">{{ r.name }}</div>

            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="opt in severityOptions"
                :key="opt.value"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                :disabled="!isValidityAndHallucinationComplete"
                :class="currentAudit(r.id).severity === opt.value
                  ? 'bg-sky-200 text-slate-900 border-sky-300'
                  : 'bg-sky-100/70 text-slate-700 border-sky-200'"
                :title="!isValidityAndHallucinationComplete ? 'Complete steps 2 and 3 first' : ''"
                @click="updateAudit(r.id, 'severity', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <h3 class="mt-3 text-xs md:text-sm font-semibold text-slate-900">5) Minimal-edit distance</h3>
        <p class="mt-1.5 text-xs text-slate-700 task-desc">
          Estimate the amount of effort required to revise this report to a clinically signable version.
        </p>
        <div class="mt-1.5 text-xs text-slate-600 space-y-0.5">
          <p><span class="font-semibold text-slate-700">0-1 min</span> - Minimal wording edits only.</p>
          <p><span class="font-semibold text-slate-700">2-5 min</span> - Minor corrections or additions needed.</p>
          <p><span class="font-semibold text-slate-700">6-10 min</span> - Substantial revisions required.</p>
          <p><span class="font-semibold text-slate-700">&gt;10 min</span> - Major rewriting required.</p>
        </div>

        <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div
            v-for="r in reports"
            :key="`${r.id}-edit-distance`"
            class="rounded-none border border-sky-200 bg-white p-2.5"
          >
            <div class="text-xs font-bold uppercase tracking-wide text-slate-700">{{ r.name }}</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="opt in editDistanceOptions"
                :key="opt.value"
                type="button"
                class="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                :disabled="!isSeverityComplete"
                :class="currentAudit(r.id).editDistance === opt.value
                  ? 'bg-sky-200 text-slate-900 border-sky-300'
                  : 'bg-sky-100/70 text-slate-700 border-sky-200'"
                :title="!isSeverityComplete ? 'Complete step 4 first' : ''"
                @click="updateAudit(r.id, 'editDistance', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="mt-2 text-[11px] text-slate-500">{{ caseLabel }}</div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import WsiViewer from "./WsiViewer.vue";

export type ClinicalValidity = "acceptable" | "unacceptable" | "uncertain";
export type IssueType = "context_mismatch" | "case_overreach" | "no_hallucination";
export type Severity = "none" | "minor" | "major";
export type EditDistance = "0-1" | "2-5" | "6-10" | ">10";
export type ReportAudit = {
  validity: ClinicalValidity | null;
  issueType: IssueType | null;
  severity: Severity | null;
  editDistance: EditDistance | null;
};

const props = defineProps<{
  reports: { id: "model1" | "model2"; name: string; text: string }[];
  caseLabel: string;
  wsiDziUrl: string;
  groundTruth: string;
  selectedId: string | null;
  model1Audit: ReportAudit;
  model2Audit: ReportAudit;
}>();

const emit = defineEmits<{
  (e: "update:selectedId", v: string | null): void;
  (e: "update:model1Audit", v: ReportAudit): void;
  (e: "update:model2Audit", v: ReportAudit): void;
}>();

const showIntro = ref(true);

const validityOptions: { value: ClinicalValidity; label: string }[] = [
  { value: "acceptable", label: "ACCEPTABLE" },
  { value: "unacceptable", label: "UNACCEPTABLE" },
  { value: "uncertain", label: "UNCERTAIN" },
];
const issueTypeOptions: { value: IssueType; label: string }[] = [
  { value: "context_mismatch", label: "CONTEXT MISMATCH" },
  { value: "case_overreach", label: "CASE-LEVEL OVERREACH" },
  { value: "no_hallucination", label: "NO HALLUCINATION" },
];
const severityOptions: { value: Severity; label: string }[] = [
  { value: "none", label: "None" },
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
];
const editDistanceOptions: { value: EditDistance; label: string }[] = [
  { value: "0-1", label: "0-1 min" },
  { value: "2-5", label: "2-5 mins" },
  { value: "6-10", label: "6-10 mins" },
  { value: ">10", label: ">10 mins" },
];

const currentAudit = (id: "model1" | "model2") => (id === "model1" ? props.model1Audit : props.model2Audit);

const isPickComplete = computed(() => !!props.selectedId);
const isDiagnosticComplete = computed(() => !!props.model1Audit.validity && !!props.model2Audit.validity);
const isHallucinationComplete = computed(() => !!props.model1Audit.issueType && !!props.model2Audit.issueType);
const isSeverityComplete = computed(() => !!props.model1Audit.severity && !!props.model2Audit.severity);
const isEditDistanceComplete = computed(() => !!props.model1Audit.editDistance && !!props.model2Audit.editDistance);
const isValidityAndHallucinationComplete = computed(() => {
  const model1 = props.model1Audit;
  const model2 = props.model2Audit;
  return !!model1.validity && !!model2.validity && !!model1.issueType && !!model2.issueType;
});

const diagnosticBlockEl = ref<HTMLElement | null>(null);
const severityBlockEl = ref<HTMLElement | null>(null);

const nextActionLabel = computed(() => {
  if (!isPickComplete.value) return "Step 1: Pick the most clinically usable report.";
  if (!isDiagnosticComplete.value) return "Step 2: Complete Diagnostic Validity for both models.";
  if (!isHallucinationComplete.value) return "Step 3: Complete Hallucination Assessment for both models.";
  if (!isSeverityComplete.value) return "Step 4: Complete Severity Assessment for both models.";
  if (!isEditDistanceComplete.value) return "Step 5: Complete Minimal-edit distance for both models.";
  return "All steps complete for this case.";
});

const stepClass = (done: boolean) =>
  done ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-slate-100 text-slate-600";

watch(isPickComplete, async (v) => {
  if (!v) return;
  await nextTick();
  diagnosticBlockEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
});

watch(isValidityAndHallucinationComplete, async (v) => {
  if (!v) return;
  await nextTick();
  severityBlockEl.value?.scrollIntoView({ behavior: "smooth", block: "start" });
});

const sectionStateClass = (isActive: boolean) =>
  isActive
    ? "border-violet-300 bg-violet-50/75 shadow-sm"
    : "border-sky-100 bg-sky-50/10 opacity-45";

const updateAudit = <K extends keyof ReportAudit>(id: "model1" | "model2", key: K, value: ReportAudit[K]) => {
  const next = { ...currentAudit(id), [key]: value };
  if (id === "model1") emit("update:model1Audit", next);
  else emit("update:model2Audit", next);
};

const ROW_CHAR_TARGET = 110;
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(8, Math.max(6, rows));
};
</script>

<style scoped>
.step-chip {
  border: 1px solid;
  padding: 0.25rem 0.5rem;
}

.task-title {
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 600;
}

.task-desc {
  background: #f5ecf8;
  border: 1px solid #ead8f0;
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
}

@media (min-width: 768px) {
  .task-title {
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}
</style>
