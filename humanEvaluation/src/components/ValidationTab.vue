<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full min-h-0 overflow-auto xl:overflow-hidden">
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
    <section class="flex flex-col min-h-0 gap-4">
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
          class="mt-3 w-full rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
        />
      </div>

      <!-- Evaluation card -->
      <div class="rounded-2xl border border-purple-200 bg-purple-50/80 p-4">
        <div class="text-xs font-bold uppercase tracking-wide text-slate-800">
          Validation
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Choose one rating and justify it.
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
          <label class="text-xs font-semibold text-slate-700">Justification</label>
          <textarea
            :value="modelValueJustification"
            :rows="rowsForJustification(modelValueJustification)"
            @input="$emit('update:justification', ($event.target as HTMLTextAreaElement).value)"
            placeholder="Explain your choice with reference to the WSI + report…"
            class="mt-2 w-full rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-hidden"
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

defineProps<{
  title: string;
  modelLabel: string;
  reportText: string;
  caseLabel: string;
  wsiDziUrl: string;

  // v-model props
  modelValueRating: Rating | null;
  modelValueJustification: string;
}>();

defineEmits<{
  (e: "update:rating", v: Rating | null): void;
  (e: "update:justification", v: string): void;
}>();

const options: { value: Rating; label: string }[] = [
  { value: "totally", label: "Totally Correct" },
  { value: "partially", label: "Partially Correct" },
  { value: "incorrect", label: "Incorrect" },
  { value: "indeterminate", label: "Indeterminate" },
];

const ROW_CHAR_TARGET = 90;
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(10, Math.max(5, rows));
};
const rowsForJustification = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(7, Math.max(3, rows));
};
</script>
