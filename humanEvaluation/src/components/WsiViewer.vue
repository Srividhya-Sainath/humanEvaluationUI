<template>
  <div class="w-full h-full">
    <div v-if="dziUrl" ref="osdEl" class="w-full h-full" />
    <div v-else class="w-full h-full flex items-center justify-center text-slate-500 text-sm">
      WSI viewer goes here
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import OpenSeadragon from "openseadragon";

const props = defineProps<{
  dziUrl: string;
}>();

const osdEl = ref<HTMLDivElement | null>(null);
let viewer: OpenSeadragon.Viewer | null = null;

function initViewer() {
  if (!osdEl.value || !props.dziUrl) return;

  if (viewer) {
    viewer.destroy();
    viewer = null;
  }

  viewer = OpenSeadragon({
    element: osdEl.value,
    prefixUrl: "/openseadragon-images/",
    tileSources: props.dziUrl,
    showNavigator: true,
    zoomPerScroll: 1.2,
    animationTime: 0.8,
    maxZoomPixelRatio: 2,
  });
}

onMounted(() => {
  initViewer();
});

watch(
  () => props.dziUrl,
  () => {
    initViewer();
  }
);

onUnmounted(() => {
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});
</script>
