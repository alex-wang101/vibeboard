'use client';

import { NEXTJS_PALETTE } from '@vibeboard/shared';
import type { DragEvent } from 'react';

const CATEGORIES = [
  { key: 'nextjs', label: 'Next.js' },
  { key: 'backend', label: 'Backend' },
  { key: 'data', label: 'Data' },
  { key: 'external', label: 'External' },
] as const;

export function NodePalette() {
  return (
    <div className="w-56 border-r border-white/10 bg-black/60 overflow-y-auto">
      <div className="px-3 py-3 border-b border-white/10">
        <h2 className="text-white/50 text-xs font-medium uppercase tracking-wider">Components</h2>
      </div>

      <div className="p-2 space-y-4">
        {CATEGORIES.map(({ key, label }) => {
          const items = NEXTJS_PALETTE.filter((p) => p.category === key);
          if (items.length === 0) return null;

          return (
            <div key={key}>
              <div className="text-white/25 text-[9px] uppercase tracking-wider px-1 mb-1.5">
                {label}
              </div>
              <div className="space-y-1">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e: DragEvent) => {
                      e.dataTransfer.setData('application/reactflow', JSON.stringify(item));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-white/5 transition-colors group"
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    <div className="min-w-0">
                      <div className="text-white/60 text-[11px] group-hover:text-white/80 transition-colors">
                        {item.label}
                      </div>
                      <div className="text-white/20 text-[9px] truncate">
                        {item.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
