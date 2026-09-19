<script setup lang="ts">
defineProps<{ label: string; value: string | number; tone?: string }>()
</script>

<template>
  <div class="stat-chip" :class="tone">
    <span class="stat-value">{{ value }}</span>
    <span class="stat-label">{{ label }}</span>
  </div>
</template>
