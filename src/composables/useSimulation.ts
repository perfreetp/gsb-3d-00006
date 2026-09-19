import { onBeforeUnmount, onMounted, ref, shallowRef, type Ref } from 'vue'
import { Simulation } from '../sim/simulation'
import type { SimSnapshot } from '../types'

export function useSimulation(container: Ref<HTMLElement | null>) {
  const sim = shallowRef<Simulation | null>(null)
  const snap = ref<SimSnapshot | null>(null)
  let timer = 0

  onMounted(() => {
    if (!container.value) return
    const instance = new Simulation(container.value)
    sim.value = instance
    instance.onSelectChange = () => {
      snap.value = instance.getSnapshot()
    }
    snap.value = instance.getSnapshot()
    timer = window.setInterval(() => {
      snap.value = instance.getSnapshot()
    }, 120)
  })

  onBeforeUnmount(() => {
    window.clearInterval(timer)
    sim.value?.dispose()
  })

  return { sim, snap }
}
