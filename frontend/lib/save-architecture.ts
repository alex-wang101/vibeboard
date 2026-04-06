import { saveArchitecture } from './api';
import type { ArchitectureGraph } from '@vibeboard/shared';

let timer: ReturnType<typeof setTimeout> | null = null;

export function debouncedSave(projectId: string, graph: ArchitectureGraph): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    saveArchitecture(projectId, graph).catch((err) =>
      console.error('[VibeBoard] Failed to save architecture:', err)
    );
  }, 2000);
}
