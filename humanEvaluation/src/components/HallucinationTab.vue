<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 h-full min-h-0 overflow-hidden">
    <!-- Left: WSI -->
    <section class="flex flex-col min-h-0 h-full gap-2 pb-4">
      <div class="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-purple-100/80 to-purple-50 p-3 text-xs text-slate-700 shadow-sm">
        <div class="font-semibold text-slate-900 mb-1">Instructions + Hallucination Taxonomy</div>
        <p class="mb-2">
          Review the WSI alongside both model reports. For each report, choose the single best hallucination category and
          add brief notes if applicable.
        </p>
        <ul class="space-y-1">
          <li>
            <span class="font-semibold">Type I:</span>
            Inclusion of data inherently invisible on an H&E slide.
          </li>
          <li>
            <span class="font-semibold">Type II:</span>
            Description of structures belonging to an unrelated organ system.
          </li>
          <li>
            <span class="font-semibold">Type III:</span>
            Fabrication of specific visual features to justify an incorrect diagnosis.
          </li>
          <li>
            <span class="font-semibold">Misclassification Only:</span>
            An incorrect diagnostic label without morphological fabrication.
          </li>
          <li>
            <span class="font-semibold">None:</span>
            Factually accurate and grounded in the visual evidence.
          </li>
        </ul>
      </div>

      <div class="flex items-baseline justify-between">
        <h3 class="text-sm font-semibold text-slate-200">WSI</h3>
      </div>

      <div
        class="flex-1 min-h-0 max-h-[52vh] rounded-2xl border border-purple-200 bg-purple-50/70 flex items-center justify-center text-purple-500 overflow-hidden"
      >
        <WsiViewer :dziUrl="wsiDziUrl" />
      </div>
    </section>

    <!-- Right -->
    <section class="flex flex-col min-h-0 gap-3 overflow-auto pr-1">
      <h3 class="text-lg font-semibold text-slate-900">Hallucination Check</h3>

      <div class="space-y-3">
        <div
          v-for="r in reports"
          :key="r.id"
          class="rounded-2xl border border-purple-200 bg-purple-50/80 p-3"
        >
          <div class="text-xs font-bold uppercase tracking-wide text-slate-800">
            Report ({{ r.name }})
          </div>

          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="opt in options"
              :key="opt.value"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              :class="currentType(r.id) === opt.value
                ? 'bg-purple-300/80 text-slate-900 border-purple-300 shadow-sm'
                : 'bg-purple-100 text-slate-700 border-purple-200 hover:border-purple-300'"
              @click="updateType(r.id, opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>

          <textarea
            readonly
            :rows="rowsForReport(r.text)"
            :value="r.text"
            class="mt-3 w-full max-h-44 rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
          />

          <div class="mt-3">
            <label class="text-xs font-semibold text-slate-700">Notes (optional)</label>
            <textarea
              :value="currentNotes(r.id)"
              :rows="rowsForNotes(currentNotes(r.id))"
              @input="updateNotes(r.id, ($event.target as HTMLTextAreaElement).value)"
              placeholder="Briefly explain the hallucination if present…"
              class="mt-2 w-full max-h-24 rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
            />
          </div>
        </div>
      </div>

      <div class="text-[11px] text-slate-500 flex items-center justify-between gap-3">
        <span>Autosaved per case.</span>
        <span>{{ caseLabel }}</span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import WsiViewer from "./WsiViewer.vue";

type HallucinationType =
  | "typeI"
  | "typeII"
  | "typeIII"
  | "misclassification"
  | "none";

const props = defineProps<{
  reports: { id: "model1" | "model2"; name: string; text: string }[];
  caseLabel: string;
  wsiDziUrl: string;
  model1Type: HallucinationType | null;
  model2Type: HallucinationType | null;
  model1Notes: string;
  model2Notes: string;
}>();

const emit = defineEmits<{
  (e: "update:model1Type", v: HallucinationType | null): void;
  (e: "update:model2Type", v: HallucinationType | null): void;
  (e: "update:model1Notes", v: string): void;
  (e: "update:model2Notes", v: string): void;
}>();

const options: { value: HallucinationType; label: string }[] = [
  { value: "typeI", label: "Type I" },
  { value: "typeII", label: "Type II" },
  { value: "typeIII", label: "Type III" },
  { value: "misclassification", label: "Misclassification Only" },
  { value: "none", label: "None" },
];

const currentType = (id: "model1" | "model2") => (id === "model1" ? props.model1Type : props.model2Type);
const currentNotes = (id: "model1" | "model2") => (id === "model1" ? props.model1Notes : props.model2Notes);
const updateType = (id: "model1" | "model2", v: HallucinationType) => {
  if (id === "model1") emit("update:model1Type", v);
  else emit("update:model2Type", v);
};
const updateNotes = (id: "model1" | "model2", v: string) => {
  if (id === "model1") emit("update:model1Notes", v);
  else emit("update:model2Notes", v);
};

const ROW_CHAR_TARGET = 110;
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(4, Math.max(2, rows));
};
const rowsForNotes = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(3, Math.max(2, rows));
};
</script>
