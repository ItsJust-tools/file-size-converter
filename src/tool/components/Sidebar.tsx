'use client';

import React from 'react';
import { unitsForBase, type ToolState } from '../types';
import { BASES } from '../ui-shared';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  const units = unitsForBase(state.base);
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="file-size-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Number base</h3>
        <ul className="space-y-1" data-testid="sidebar-base-options">
          {BASES.map((base) => (
            <li key={base.value}>
              <button
                type="button"
                data-testid={`sidebar-base-${base.value}`}
                onClick={() => onChange({ ...state, base: base.value })}
                className={`w-full rounded-md border px-2 py-1 text-left text-xs ${
                  state.base === base.value
                    ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
                }`}
              >
                <span className="font-medium">{base.label}</span> — {base.hint}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
          Unit ladder ({state.base === 'si' ? 'SI' : 'IEC'})
        </h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {units.map((unit) => (
            <li key={unit.symbol} className="flex justify-between gap-2">
              <span className="font-mono">{unit.symbol}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {unit.name} ({unit.bytesPerUnit} bytes)
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>B</kbd> — toggle SI / binary base
          </li>
          <li>
            <kbd>C</kbd> — copy summary
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current value, unit, base and
          precision; open it to restore this conversion.
        </p>
      </div>
    </div>
  );
};
