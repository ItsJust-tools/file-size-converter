import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import {
  DEFAULT_STATE,
  MAX_HISTORY,
  clampPrecision,
  isBase,
  isValidUnit,
  parseNumber,
  summaryText,
  humanSummary,
  type Base,
  type FieldUnit,
  type HistoryEntry,
  type ToolState,
} from './types';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({
    inputUnit: state.inputUnit,
    inputValue: state.inputValue,
    base: state.base,
    precision: state.precision,
    history: state.history,
  });
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function baseOr(value: unknown, fallback: Base): Base {
  return isBase(value) ? value : fallback;
}

function unitOr(value: unknown, fallback: FieldUnit): FieldUnit {
  return isValidUnit(value) ? value : fallback;
}

function precisionOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? clampPrecision(parsed) : fallback;
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected file size converter state object',
    };
  }
  const v = data as Record<string, unknown>;
  const state: ToolState = {
    inputUnit: unitOr(v.inputUnit, DEFAULT_STATE.inputUnit),
    inputValue: stringOr(v.inputValue, DEFAULT_STATE.inputValue),
    base: baseOr(v.base, DEFAULT_STATE.base),
    precision: precisionOr(v.precision, DEFAULT_STATE.precision),
    history: validHistory(v.history),
  };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

/** Deserialize URL query parameters back into tool state (partial overrides allowed). */
export function stateFromParams(params: URLSearchParams): DeserializeResult<ToolState> {
  const payload: Record<string, unknown> = {};
  const unit = params.get('unit');
  if (unit !== null) payload.inputUnit = unit;
  const value = params.get('value');
  if (value !== null) payload.inputValue = value;
  const base = params.get('base');
  if (base !== null) payload.base = base;
  const precision = params.get('precision');
  if (precision !== null) payload.precision = precision;
  if (Object.keys(payload).length === 0) {
    return { success: false, error: 'No converter parameters in URL' };
  }
  const baseResult = deserializeState({ ...DEFAULT_STATE, ...payload });
  return baseResult.success ? { success: true, data: baseResult.data } : baseResult;
}

/** Serialize the converter essentials into URL query parameters. */
export function paramsFromState(state: ToolState): URLSearchParams {
  const params = new URLSearchParams();
  params.set('unit', state.inputUnit);
  params.set('value', state.inputValue);
  params.set('base', state.base);
  params.set('precision', String(state.precision));
  return params;
}

const numberOrNull = (value: string): number | null => parseNumber(value);

export const fileSizeConverterTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { numberOrNull, summaryText, humanSummary };
