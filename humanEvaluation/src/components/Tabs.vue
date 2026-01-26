<template>
  <div>
    <div class="flex flex-wrap gap-2 rounded-2xl border border-blue-200/70 bg-white/60 p-2 shadow-sm mb-4">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        class="px-4 py-2 text-sm font-semibold rounded-full transition-all"
        :class="modelValue === t.id
          ? 'bg-sky-200 text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900 hover:bg-sky-100/60'"
        @click="$emit('update:modelValue', t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
type TabId = string;

defineProps<{
  modelValue: TabId;
  tabs: ReadonlyArray<{ id: TabId; label: string }>;
}>();

defineEmits<{ (e: "update:modelValue", v: TabId): void }>();
</script>
