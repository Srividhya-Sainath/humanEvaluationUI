<template>
  <div
    v-if="!tab1Complete"
    class="h-full min-h-0 overflow-auto border border-sky-200 bg-white p-4"
  >
    <h2 class="text-sm md:text-base font-semibold text-slate-900">LLM-as-evaluator auditing</h2>
    <p class="mt-2 text-xs text-slate-700">
      Complete all required fields in Tab 1 for this case before starting Tab 2.
    </p>
    <div class="mt-3 text-xs text-slate-700 task-desc">
      Once Tab 1 is complete, this tab will unlock and show the detailed LLM-auditing workflow.
    </div>
  </div>

  <div
    v-else-if="showIntro"
    class="h-full min-h-0 overflow-auto border border-sky-200 bg-white p-4"
  >
    <h2 class="text-sm md:text-base font-semibold text-slate-900">LLM-as-evaluator auditing overview</h2>
    <p class="mt-2 text-xs text-slate-700">
      In this tab, you will audit whether the LLM-derived outputs are reliable for this case.
    </p>
    <div class="mt-3 text-xs text-slate-700 space-y-1.5 task-desc">
      <p>Review both model reports and indicate Agree/Disagree for:</p>
      <ul class="list-disc pl-5 space-y-0.5">
        <li>Predicted label</li>
        <li>Any Hallucination flag</li>
        <li>Context mismatch flag</li>
        <li>Case-level overreach flag</li>
      </ul>
      <p>
        <span class="font-semibold">Context mismatch flag:</span> Incorrect tissue/organ context, incompatible diagnosis,
        or morphologic descriptions inconsistent with the slide’s organ system.
      </p>
      <p>
        <span class="font-semibold">Case-level overreach flag:</span> Statements not supportable from a single H&amp;E slide
        (e.g., molecular markers, margin status, staging, lymph nodes, multi-slide integration).
      </p>
    </div>
    <button
      type="button"
      class="mt-4 px-3 py-2 border border-sky-300 bg-sky-100 text-slate-900 text-xs font-semibold"
      @click="showIntro = false"
    >
      Start auditing
    </button>
  </div>

  <div v-else class="h-full min-h-0 overflow-auto grid grid-cols-1 xl:grid-cols-2 gap-3">
    <section class="xl:col-span-2 rounded-none border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-900">
      Please export/save your evaluation JSON and share it with
      <span class="font-semibold"> srividhya.sainath@tu-dresden.de </span>
      and/or
      <span class="font-semibold"> zunamys.carrero@tu-dresden.de</span>.
    </section>

    <section class="xl:col-span-2 sticky top-0 z-20 border border-sky-200 bg-white/95 backdrop-blur-sm p-2">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
        <div class="step-chip" :class="stepClass(isModel1Complete)">Model 1 LLM Output Review</div>
        <div class="step-chip" :class="stepClass(isModel2Complete)">Model 2 LLM Output Review</div>
      </div>
      <p class="mt-1 text-xs text-slate-600">Next required action: <span class="font-semibold">{{ nextActionLabel }}</span></p>
    </section>

    <div class="min-h-0 flex flex-col gap-3">
      <section class="rounded-none border border-sky-200 bg-sky-50/70 p-2.5 min-h-0 flex flex-col xl:h-[300px]">
        <h3 class="text-xs md:text-sm font-semibold text-slate-900">WSI and Ground Truth</h3>
        <p class="mt-1.5 text-xs text-slate-700">
          <span class="rounded-none bg-emerald-100 px-1.5 py-0.5 text-emerald-900">Ground truth:</span>
          <span class="font-semibold text-slate-800 rounded-none bg-emerald-100 px-1.5 py-0.5 text-emerald-900">
            {{ groundTruth || "false" }}
          </span>
        </p>
        <div class="mt-2 flex-1 min-h-0 rounded-none border border-sky-200 bg-white overflow-hidden">
          <WsiViewer :dziUrl="wsiDziUrl" />
        </div>
      </section>

      <section class="rounded-none border border-sky-200 bg-sky-50/70 p-2.5 min-h-0 flex-1 overflow-y-auto">
        <h3 class="text-xs md:text-sm font-semibold text-slate-900">Instructions</h3>
        <div class="mt-2 text-xs text-slate-700 space-y-1.5 task-desc">
          <p>For each model report, review and mark whether you <span class="font-semibold">Agree</span> or <span class="font-semibold">Disagree</span> with:</p>
          <ul class="list-disc pl-5 space-y-0.5">
            <li>Predicted label</li>
            <li>Any Hallucination flag</li>
            <li>Context mismatch flag</li>
            <li>Case-level overreach flag</li>
          </ul>
          <p>
            <span class="font-semibold">Context mismatch flag:</span> Incorrect tissue/organ context, incompatible diagnosis,
            or morphologic descriptions inconsistent with the slide’s organ system.
          </p>
          <p>
            <span class="font-semibold">Case-level overreach flag:</span> Statements not supportable from a single H&amp;E
            slide (e.g., molecular markers, margin status, staging, lymph nodes, multi-slide integration).
          </p>
        </div>
      </section>
    </div>

    <div class="min-h-0 flex flex-col gap-3">
      <section
        v-for="r in reports"
        :key="r.id"
        class="rounded-none border border-sky-200 bg-sky-50/70 p-2.5 min-h-0 flex-1 overflow-y-auto"
      >
      <h3 class="text-xs md:text-sm font-semibold text-slate-900">{{ r.name }} LLM Output Review</h3>

      <div class="mt-2 rounded-none border border-sky-200 bg-white p-2.5">
        <textarea
          readonly
          :rows="rowsForReport(r.text)"
          :value="r.text"
          class="w-full rounded-none border border-slate-300 bg-slate-100 p-2.5 text-xs leading-relaxed text-slate-800 resize-none overflow-y-auto"
        />
      </div>

      <div class="mt-2 space-y-2">
        <div class="rounded-none border border-sky-200 bg-white p-2.5">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="text-xs text-slate-700"><span class="font-semibold">Predicted label:</span> {{ r.llmLabel || "false" }}</div>
            <div class="flex gap-2">
            <button
              v-for="choice in choices"
              :key="`label-${r.id}-${choice.value}`"
              type="button"
              class="px-2.5 py-1 rounded-none text-xs font-semibold border transition-all"
              :class="currentAgreement(r.id).labelAgreement === choice.value ? activeChoiceClass : inactiveChoiceClass"
              @click="emitAgreement(r.id, 'labelAgreement', choice.value)"
            >
              {{ choice.label }}
            </button>
            </div>
          </div>
        </div>

        <div class="rounded-none border border-sky-200 bg-white p-2.5">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="text-xs text-slate-700"><span class="font-semibold">Any Hallucination flag:</span> {{ r.llmHallucination || "false" }}</div>
            <div class="flex gap-2">
            <button
              v-for="choice in choices"
              :key="`hall-${r.id}-${choice.value}`"
              type="button"
              class="px-2.5 py-1 rounded-none text-xs font-semibold border transition-all"
              :class="currentAgreement(r.id).hallucinationAgreement === choice.value ? activeChoiceClass : inactiveChoiceClass"
              @click="emitAgreement(r.id, 'hallucinationAgreement', choice.value)"
            >
              {{ choice.label }}
            </button>
            </div>
          </div>
        </div>

        <div class="rounded-none border border-sky-200 bg-white p-2.5">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="text-xs text-slate-700"><span class="font-semibold">Context mismatch flag:</span> {{ r.llmContext || "false" }}</div>
            <div class="flex gap-2">
            <button
              v-for="choice in choices"
              :key="`ctx-${r.id}-${choice.value}`"
              type="button"
              class="px-2.5 py-1 rounded-none text-xs font-semibold border transition-all"
              :class="currentAgreement(r.id).contextAgreement === choice.value ? activeChoiceClass : inactiveChoiceClass"
              @click="emitAgreement(r.id, 'contextAgreement', choice.value)"
            >
              {{ choice.label }}
            </button>
            </div>
          </div>
        </div>

        <div class="rounded-none border border-sky-200 bg-white p-2.5">
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div class="text-xs text-slate-700"><span class="font-semibold">Case-level overreach flag:</span> {{ r.llmCase || "false" }}</div>
            <div class="flex gap-2">
            <button
              v-for="choice in choices"
              :key="`case-${r.id}-${choice.value}`"
              type="button"
              class="px-2.5 py-1 rounded-none text-xs font-semibold border transition-all"
              :class="currentAgreement(r.id).caseAgreement === choice.value ? activeChoiceClass : inactiveChoiceClass"
              @click="emitAgreement(r.id, 'caseAgreement', choice.value)"
            >
              {{ choice.label }}
            </button>
            </div>
          </div>
        </div>

        <div class="rounded-none border border-sky-200 bg-white p-2.5">
          <div class="text-xs font-semibold text-slate-700">Comments</div>
          <p class="mt-1 text-xs text-slate-600">
            Please document any discrepancies, concerns about the weak label, diagnostic ambiguities, or particularly challenging aspects of the case.
          </p>
          <textarea
            :rows="3"
            :value="currentAgreement(r.id).comments"
            @input="emitComments(r.id, ($event.target as HTMLTextAreaElement).value)"
            class="mt-1 w-full rounded-none border border-sky-200 bg-white p-2.5 text-xs leading-relaxed text-slate-800 resize-y"
          />
        </div>
      </div>
      </section>
    </div>

    <section class="xl:col-span-2 text-[11px] text-slate-500 flex items-center justify-between gap-3">
      <span>Autosaved per case.</span>
      <span>{{ caseLabel }}</span>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WsiViewer from "./WsiViewer.vue";

type Agreement = "agree" | "disagree" | null;

type AgreementSet = {
  labelAgreement: Agreement;
  hallucinationAgreement: Agreement;
  contextAgreement: Agreement;
  caseAgreement: Agreement;
  comments: string;
};

const props = defineProps<{
  reports: {
    id: "model1" | "model2";
    name: string;
    text: string;
    llmLabel: string;
    llmHallucination: string;
    llmContext: string;
    llmCase: string;
  }[];
  caseLabel: string;
  wsiDziUrl: string;
  groundTruth: string;
  tab1Complete: boolean;
  model1Agreement?: AgreementSet;
  model2Agreement?: AgreementSet;
}>();

const showIntro = ref(true);

const emit = defineEmits<{
  (e: "update:model1Label", v: Agreement): void;
  (e: "update:model2Label", v: Agreement): void;
  (e: "update:model1Hallucination", v: Agreement): void;
  (e: "update:model2Hallucination", v: Agreement): void;
  (e: "update:model1Context", v: Agreement): void;
  (e: "update:model2Context", v: Agreement): void;
  (e: "update:model1Case", v: Agreement): void;
  (e: "update:model2Case", v: Agreement): void;
  (e: "update:model1Comments", v: string): void;
  (e: "update:model2Comments", v: string): void;
}>();

const choices: { value: Exclude<Agreement, null>; label: string }[] = [
  { value: "agree", label: "Agree" },
  { value: "disagree", label: "Disagree" },
];

const activeChoiceClass = "bg-sky-200 text-slate-900 border-sky-300";
const inactiveChoiceClass = "bg-sky-100/70 text-slate-700 border-sky-200";

const emptyAgreement: AgreementSet = {
  labelAgreement: null,
  hallucinationAgreement: null,
  contextAgreement: null,
  caseAgreement: null,
  comments: "",
};

const currentAgreement = (id: "model1" | "model2") => {
  if (id === "model1") return props.model1Agreement ?? emptyAgreement;
  return props.model2Agreement ?? emptyAgreement;
};

const isAgreementComplete = (entry: AgreementSet | undefined) =>
  !!entry?.labelAgreement &&
  !!entry?.hallucinationAgreement &&
  !!entry?.contextAgreement &&
  !!entry?.caseAgreement;

const isModel1Complete = computed(() => isAgreementComplete(props.model1Agreement));
const isModel2Complete = computed(() => isAgreementComplete(props.model2Agreement));

const nextActionLabel = computed(() => {
  if (!isModel1Complete.value) return "Complete Model 1 agreements.";
  if (!isModel2Complete.value) return "Complete Model 2 agreements.";
  return "All model agreements complete for this case.";
});

const stepClass = (done: boolean) =>
  done ? "border-emerald-300 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-slate-100 text-slate-600";

const emitAgreement = (
  id: "model1" | "model2",
  field: keyof AgreementSet,
  value: Exclude<Agreement, null>
) => {
  if (id === "model1") {
    if (field === "labelAgreement") emit("update:model1Label", value);
    if (field === "hallucinationAgreement") emit("update:model1Hallucination", value);
    if (field === "contextAgreement") emit("update:model1Context", value);
    if (field === "caseAgreement") emit("update:model1Case", value);
    return;
  }
  if (field === "labelAgreement") emit("update:model2Label", value);
  if (field === "hallucinationAgreement") emit("update:model2Hallucination", value);
  if (field === "contextAgreement") emit("update:model2Context", value);
  if (field === "caseAgreement") emit("update:model2Case", value);
};

const emitComments = (id: "model1" | "model2", value: string) => {
  if (id === "model1") emit("update:model1Comments", value);
  else emit("update:model2Comments", value);
};

const ROW_CHAR_TARGET = 120;
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(2, Math.max(3, rows));
};
</script>

<style scoped>
.step-chip {
  border: 1px solid;
  padding: 0.25rem 0.5rem;
}

.task-desc {
  background: #f5ecf8;
  border: 1px solid #ead8f0;
  padding: 0.375rem 0.5rem;
}
</style>
