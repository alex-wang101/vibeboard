'use client';

import { useCanvasStore } from '@/stores/canvas-store';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export function BreadcrumbNav() {
  const currentPath = useCanvasStore((s) => s.currentPath);
  const navigateBack = useCanvasStore((s) => s.navigateBack);
  const navigateTo = useCanvasStore((s) => s.navigateTo);
  const navigationHistory = useCanvasStore((s) => s.navigationHistory);

  const segments = currentPath ? currentPath.split('/') : [];

  return (
    <nav className="flex items-center gap-1 px-4 py-2 text-sm border-b border-white/10 bg-black/40">
      {navigationHistory.length > 0 && (
        <button
          onClick={navigateBack}
          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors mr-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
      )}

      <button
        onClick={() => navigateTo('')}
        className={`text-xs transition-colors ${
          segments.length === 0
            ? 'text-white/80 font-medium'
            : 'text-white/40 hover:text-white/70'
        }`}
      >
        Root
      </button>

      {segments.map((segment, i) => {
        const pathUpToHere = segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;

        return (
          <span key={pathUpToHere} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-white/20" />
            <button
              onClick={() => !isLast && navigateTo(pathUpToHere)}
              className={`text-xs transition-colors ${
                isLast
                  ? 'text-white/80 font-medium cursor-default'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {segment}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
