<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 h-full min-h-0 overflow-hidden">
    <!-- Left: WSI placeholder -->
    <section class="flex flex-col min-h-0">
      <div class="flex items-baseline justify-between mb-2">
        <h3 class="text-sm font-semibold text-slate-200">WSI</h3>
      </div>

      <div
        class="h-56 sm:h-64 md:h-80 xl:h-auto xl:flex-1 xl:min-h-0 rounded-2xl border border-purple-200 bg-purple-50/70 flex items-center justify-center text-purple-500 overflow-hidden"
      >
        <WsiViewer :dziUrl="wsiDziUrl" />
      </div>
    </section>

    <!-- Right -->
    <section class="flex flex-col min-h-0 gap-3 overflow-auto pr-1">
      <h3 class="text-lg font-semibold text-slate-900">
        {{ title }}
      </h3>

      <!-- Report card -->
      <div class="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 flex flex-col min-h-0">
        <div class="text-xs font-bold uppercase tracking-wide text-slate-800">
          Report ({{ modelLabel }})
        </div>

        <textarea
          readonly
          :rows="rowsForReport(reportText)"
          :value="reportText"
          class="mt-3 w-full max-h-48 rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
        />
      </div>

      <!-- Evaluation card -->
      <div class="rounded-2xl border border-purple-200 bg-purple-50/80 p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-slate-800">
          Validation
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Choose a correctness rating and a style rating, then justify both.
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <button
            v-for="opt in options"
            :key="opt.value"
            type="button"
            class="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all shadow-sm"
            :class="modelValueRating === opt.value
              ? 'bg-purple-300/80 text-slate-900 border-purple-300'
              : 'bg-purple-100 text-slate-700 border-purple-200 hover:border-purple-300'"
            @click="$emit('update:rating', opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>

        <div class="mt-4">
          <label class="text-xs font-semibold text-slate-700">Correctness justification</label>
          <textarea
            :value="modelValueCorrectnessJustification"
            :rows="rowsForJustification(modelValueCorrectnessJustification)"
            @input="$emit('update:correctnessJustification', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Explain correctness with reference to the WSI + report…"
            class="mt-2 w-full max-h-28 rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
          />
        </div>

        <div class="mt-4">
          <label class="text-xs font-semibold text-slate-700">Report style rating</label>
          <p class="mt-1 text-xs text-slate-500">Clinical usefulness of the report style.</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="opt in styleOptions"
              :key="opt.value"
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              :class="modelValueStyleRating === opt.value
                ? 'bg-purple-300/80 text-slate-900 border-purple-300 shadow-sm'
                : 'bg-purple-100 text-slate-700 border-purple-200 hover:border-purple-300'"
              @click="$emit('update:styleRating', opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="mt-4">
          <label class="text-xs font-semibold text-slate-700">Style justification</label>
          <textarea
            :value="modelValueStyleJustification"
            :rows="rowsForJustification(modelValueStyleJustification)"
            @input="$emit('update:styleJustification', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Explain style with reference to the report…"
            class="mt-2 w-full max-h-28 rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
          />
        </div>

        <div class="mt-4 flex items-center justify-between gap-3">
          <p class="text-[11px] text-slate-500">
            Autosaved per case.
          </p>
          <div class="text-[11px] text-slate-500">
            {{ caseLabel }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import WsiViewer from "./WsiViewer.vue";

type Rating = "totally" | "partially" | "incorrect" | "indeterminate";

const props = defineProps<{
  title: string;
  modelLabel: string;
  reportText: string;
  caseLabel: string;
  wsiDziUrl: string;

  // v-model props
  modelValueRating: Rating | null;
  modelValueCorrectnessJustification: string;
  modelValueStyleJustification: string;
  modelValueStyleRating: StyleRating | null;
}>();

const emit = defineEmits<{
  (e: "update:rating", v: Rating | null): void;
  (e: "update:correctnessJustification", v: string): void;
  (e: "update:styleJustification", v: string): void;
  (e: "update:styleRating", v: StyleRating | null): void;
}>();

const options: { value: Rating; label: string }[] = [
  { value: "totally", label: "Totally Correct" },
  { value: "partially", label: "Partially Correct" },
  { value: "incorrect", label: "Incorrect" },
  { value: "indeterminate", label: "Indeterminate" },
];
type StyleRating = "1" | "2" | "3" | "4" | "5";
const styleOptions: { value: StyleRating; label: string }[] = [
  { value: "1", label: "Clinically not helpful" },
  { value: "2", label: "Limited clinical utility" },
  { value: "3", label: "Adequate / acceptable" },
  { value: "4", label: "Clear and clinically helpful" },
  { value: "5", label: "Excellent clinical utility" },
];

const ROW_CHAR_TARGET = 90;
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(5, Math.max(3, rows));
};
const rowsForJustification = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(4, Math.max(2, rows));
};
</script>
