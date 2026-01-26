<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="flex items-center gap-4">
      <button
        type="button"
        class="px-4 py-2 rounded-full border border-sky-200/70 bg-sky-200/90 text-slate-900 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        @click="$emit('prev')"
        :disabled="disablePrev"
        :class="disablePrev ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-sm' : ''"
        title="Previous case (←)"
      >
        ← Prev
      </button>

      <button
        type="button"
        class="px-4 py-2 rounded-full border border-sky-200/70 bg-sky-200/90 text-slate-900 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
        @click="$emit('next')"
        :disabled="disableNext"
        :class="disableNext ? 'opacity-40 cursor-not-allowed hover:translate-y-0 hover:shadow-sm' : ''"
        title="Next case (→)"
      >
        Next →
      </button>
    </div>

    <div class="flex items-center gap-2">
      <span class="text-xs font-semibold text-blue-500/80">Case</span>
      <select
        class="px-3 py-2 rounded-full border border-blue-200/60 bg-white/70 text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-200/70"
        :value="activeCaseId"
        @change="$emit('set', ($event.target as HTMLSelectElement).value)"
      >
        <option v-for="c in cases" :key="c.id" :value="c.id">
          {{ c.label }}
        </option>
      </select>

      <span class="text-xs text-blue-500/70">
        ({{ index + 1 }} / {{ cases.length }})
      </span>
    </div>

    <div class="flex-1"></div>

    <div class="flex items-center gap-2">
      <span class="text-sm font-semibold text-blue-500/80 w-20 text-right mr-6">
        {{ progressPercent }}%
      </span>
      <div class="relative h-3 w-44 rounded-full bg-white/70 border border-blue-200/60">
        <div
          class="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-sky-200/80 via-blue-200/80 to-purple-200/80"
          :style="{ width: progressPercent + '%' }"
        ></div>
        <div
          class="absolute -top-3 -translate-x-1/2 h-9 w-9 rounded-full border border-blue-200/70 shadow-md bg-center bg-cover"
          :style="{ left: progressPercent + '%', backgroundImage: `url(${progressImageUrl})` }"
          title="WSI progress"
        ></div>
      </div>

      <button
        type="button"
        class="px-4 py-2 rounded-full bg-blue-200 text-slate-900 font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-200/70"
        @click="$emit('export')"
        title="Download all annotations as JSON"
      >
        Export JSON
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">

const progressImageUrl = `${import.meta.env.BASE_URL}image.png`;

defineEmits<{
  (e: "prev"): void;
  (e: "next"): void;
  (e: "set", id: string): void;
  (e: "export"): void;
}>();

defineProps<{
  cases: { id: string; label: string }[];
  activeCaseId: string;
  index: number;
  disablePrev: boolean;
  disableNext: boolean;
  progressPercent: number;
}>();
</script>
