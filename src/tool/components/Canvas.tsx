'use client';

import React from 'react';
import {
  convertAll,
  formatWithPrecision,
  humanSummary,
  parseNumber,
  precisionFor,
  selectableUnits,
  unitBySymbol,
  type FieldUnit,
  type ToolState,
} from '../types';
import { BASES } from '../ui-shared';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const numberInputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const value = parseNumber(state.inputValue);
  const selectables = selectableUnits(state.base);
  const results =
    value !== null
      ? convertAll(state.base, state.inputUnit, value)
      : ({} as Record<string, number>);
  const summary =
    value !== null ? humanSummary(state.base, state.inputUnit, value, state.precision) : null;
  const sourceDef = unitBySymbol(state.base, state.inputUnit);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="file-size-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Number base"
        data-testid="base-tabs"
      >
        {BASES.map((base) => (
          <button
            key={base.value}
            type="button"
            role="tab"
            aria-selected={state.base === base.value}
            data-testid={`base-tab-${base.value}`}
            title={base.hint}
            onClick={() => update({ base: base.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.base === base.value
                ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {base.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2" data-testid="input-group">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Value
          <input
            type="text"
            inputMode="decimal"
            value={state.inputValue}
            onChange={(e) => update({ inputValue: e.target.value })}
            data-testid="input-value"
            className={numberInputClass}
          />
        </label>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Unit
          <select
            value={state.inputUnit}
            onChange={(e) => update({ inputUnit: e.target.value as FieldUnit })}
            data-testid="input-unit"
            className={numberInputClass}
          >
            {selectables.map((unit) => (
              <option key={unit.symbol} value={unit.symbol}>
                {unit.symbol} — {unit.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
        data-testid="summary-card"
        role="status"
        aria-live="polite"
      >
        <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
          Summary
        </span>
        <span
          className="block text-sm font-medium text-gray-800 dark:text-gray-100"
          data-testid="summary-text"
        >
          {summary ?? 'Enter a valid number to convert.'}
        </span>
        {summary ? (
          <button
            type="button"
            data-testid="btn-save-history"
            onClick={() => onSaveHistory?.(summary)}
            className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Save to history
          </button>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          All units ({state.base === 'si' ? 'SI 1000-based' : 'Binary 1024-based'})
        </h3>
        <ul className="space-y-1" data-testid="results-list">
          {selectables.map((unit) => {
            const converted = results[unit.symbol];
            const isSource = unit.symbol === (state.inputUnit as string);
            const display =
              converted === undefined
                ? '—'
                : formatWithPrecision(converted, precisionFor(converted, state.precision));
            return (
              <li
                key={unit.symbol}
                className={`flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs ${
                  isSource
                    ? 'border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-900/30'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
                data-testid={`result-${unit.symbol}`}
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">{unit.symbol}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-gray-900 dark:text-gray-100">{display}</span>
                  {converted !== undefined ? (
                    <CopyButton value={display} testid={`copy-${unit.symbol}`} />
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {sourceDef ? (
        <p
          className="text-center text-xs text-gray-500 dark:text-gray-400"
          data-testid="factor-hint"
        >
          1 {sourceDef.symbol} = {formatWithPrecision(sourceDef.bytesPerUnit * 8, 0)} bits
        </p>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved conversions yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All conversions run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
