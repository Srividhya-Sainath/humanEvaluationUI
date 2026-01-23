<template>
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 h-full min-h-0">
    <!-- Left: WSI placeholder -->
    <section class="flex flex-col min-h-0 h-full">
      <div class="flex items-baseline justify-between mb-2">
        <h3 class="text-sm font-semibold text-slate-200">WSI</h3>
      </div>

      <div
        class="h-56 sm:h-64 md:h-72 lg:h-80 xl:h-auto xl:flex-1 xl:min-h-0 rounded-2xl border border-purple-200 bg-purple-50/70 flex items-center justify-center text-purple-500 overflow-hidden"
      >
        <WsiViewer :dziUrl="wsiDziUrl" />
      </div>
    </section>

    <!-- Right -->
    <section class="flex flex-col min-h-0 gap-2">
      <h3 class="text-lg font-semibold text-slate-900">Pick the best report</h3>

      <div class="space-y-2">
        <div
          v-for="r in reports"
          :key="r.id"
          class="rounded-2xl border p-2 bg-purple-50/80 transition-all"
          :class="selectedId === r.id
            ? 'border-purple-300 ring-1 ring-purple-300/60 bg-purple-100/70'
            : 'border-purple-200 hover:border-purple-300'"
          @click="$emit('update:selectedId', r.id)"
          @keydown.enter.prevent="$emit('update:selectedId', r.id)"
          @keydown.space.prevent="$emit('update:selectedId', r.id)"
          role="button"
          tabindex="0"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wide text-slate-800">
                  {{ r.name }}
                </span>
              </div>
            </div>

            <button
              type="button"
              class="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              :class="selectedId === r.id
                ? 'bg-purple-300/80 text-slate-900 border-purple-300 shadow-sm'
                : 'bg-purple-100 text-slate-700 border-purple-200 hover:border-purple-300'"
              @click.stop="$emit('update:selectedId', r.id)"
            >
              {{ selectedId === r.id ? "Picked" : "Pick this report" }}
            </button>
          </div>

          <textarea
            readonly
            :rows="rowsForReport(r.text)"
            :value="r.text"
            class="mt-2 w-full rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-y-auto"
          />
        </div>
      </div>

      <div class="rounded-2xl border border-purple-200 bg-purple-50/80 p-3">
        <label class="text-xs font-semibold text-slate-700">Justification</label>
        <textarea
          :value="justification"
          :rows="rowsForJustification(justification)"
          @input="$emit('update:justification', ($event.target as HTMLTextAreaElement).value)"
          placeholder="Why is this report best for this case?"
          class="mt-2 w-full rounded-xl border border-purple-200 bg-purple-50/90 p-3 text-sm leading-relaxed text-slate-800 resize-none overflow-hidden"
        />

        <div class="mt-3 flex items-center justify-between gap-3">
          <p class="text-[11px] text-slate-500">Autosaved per case.</p>
          <div class="text-[11px] text-slate-500">{{ caseLabel }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import WsiViewer from "./WsiViewer.vue";

const props = defineProps<{
  reports: { id: string; name: string; tag: string; text: string }[];
  caseLabel: string;
  selectedId: string | null;
  justification: string;
  wsiDziUrl: string;
}>();

defineEmits<{
  (e: "update:selectedId", v: string | null): void;
  (e: "update:justification", v: string): void;
}>();

const ROW_CHAR_TARGET = 120;
const reportRowsCap = computed(() => {
  const totalLength = props.reports.reduce((sum, r) => sum + r.text.length, 0);
  if (totalLength > 1800) return 2;
  if (totalLength > 1200) return 3;
  return 4;
});
const justificationRowsCap = computed(() => (reportRowsCap.value <= 2 ? 3 : 4));
const rowsForReport = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(reportRowsCap.value, Math.max(2, rows));
};
const rowsForJustification = (text: string) => {
  const rows = Math.ceil(text.length / ROW_CHAR_TARGET);
  return Math.min(justificationRowsCap.value, Math.max(2, rows));
};
</script>
