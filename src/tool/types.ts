export type Base = 'si' | 'binary';

/** Units shown in the current base. Index is the exponent of the base factor. */
export interface UnitDef {
  /** Short symbol, e.g. KB or KiB. */
  symbol: string;
  /** Full name, e.g. kilobyte. */
  name: string;
  /** Factor from bytes to this unit in the current base. */
  bytesPerUnit: number;
}

export const SI_UNITS: UnitDef[] = [
  { symbol: 'B', name: 'byte', bytesPerUnit: 1 },
  { symbol: 'KB', name: 'kilobyte', bytesPerUnit: 1e3 },
  { symbol: 'MB', name: 'megabyte', bytesPerUnit: 1e6 },
  { symbol: 'GB', name: 'gigabyte', bytesPerUnit: 1e9 },
  { symbol: 'TB', name: 'terabyte', bytesPerUnit: 1e12 },
  { symbol: 'PB', name: 'petabyte', bytesPerUnit: 1e15 },
];

export const BINARY_UNITS: UnitDef[] = [
  { symbol: 'B', name: 'byte', bytesPerUnit: 1 },
  { symbol: 'KiB', name: 'kibibyte', bytesPerUnit: 1024 },
  { symbol: 'MiB', name: 'mebibyte', bytesPerUnit: 1024 ** 2 },
  { symbol: 'GiB', name: 'gibibyte', bytesPerUnit: 1024 ** 3 },
  { symbol: 'TiB', name: 'tebibyte', bytesPerUnit: 1024 ** 4 },
  { symbol: 'PiB', name: 'pebibyte', bytesPerUnit: 1024 ** 5 },
];

export function unitsForBase(base: Base): UnitDef[] {
  return base === 'si' ? SI_UNITS : BINARY_UNITS;
}

/** Bit-level units are always available alongside byte units. */
export const BIT_UNITS: UnitDef[] = [
  { symbol: 'bit', name: 'bit', bytesPerUnit: 1 / 8 },
  { symbol: 'kbit', name: 'kilobit', bytesPerUnit: 125 },
  { symbol: 'Mbit', name: 'megabit', bytesPerUnit: 125e3 },
  { symbol: 'Gbit', name: 'gigabit', bytesPerUnit: 125e6 },
];

export type FieldUnit = 'bit' | 'kbit' | 'Mbit' | 'Gbit' | 'B' | UnitSymbol;

export type UnitSymbol =
  'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB' | 'KiB' | 'MiB' | 'GiB' | 'TiB' | 'PiB';

/** All selectable input units for a given base (bit units + all byte units). */
export function selectableUnits(base: Base): UnitDef[] {
  return [...BIT_UNITS, ...unitsForBase(base)];
}

export function unitBySymbol(base: Base, symbol: FieldUnit): UnitDef | null {
  if (symbol === 'bit') return BIT_UNITS[0] ?? null;
  if (symbol === 'kbit') return BIT_UNITS[1] ?? null;
  if (symbol === 'Mbit') return BIT_UNITS[2] ?? null;
  if (symbol === 'Gbit') return BIT_UNITS[3] ?? null;
  const byteSym = symbol as UnitSymbol;
  const all = [...SI_UNITS, ...BINARY_UNITS];
  return all.find((u) => u.symbol === byteSym) ?? null;
}

export interface ToolState {
  /** Base unit of the active input field. */
  inputUnit: FieldUnit;
  /** Raw string typed by the user in the input field. */
  inputValue: string;
  /** SI (1000-based) or binary/IEC (1024-based) display base. */
  base: Base;
  /** Decimal precision (0-8) used to format results. */
  precision: number;
  /** Saved conversion history, newest first. */
  history: HistoryEntry[];
}

export interface HistoryEntry {
  text: string;
  createdAt: string;
}

export const DEFAULT_STATE: ToolState = {
  inputUnit: 'MB',
  inputValue: '1',
  base: 'si',
  precision: 2,
  history: [],
};

export const MAX_HISTORY = 20;
export const MIN_PRECISION = 0;
export const MAX_PRECISION = 8;

/** Parse a plain decimal number; returns null for empty/unparseable input. */
export function parseNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function clampPrecision(precision: number): number {
  if (!Number.isFinite(precision)) return DEFAULT_STATE.precision;
  return Math.min(MAX_PRECISION, Math.max(MIN_PRECISION, Math.round(precision)));
}

/** Format a value with fixed precision, trimming trailing zeros for display stability. */
export function formatWithPrecision(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '—';
  const clamped = clampPrecision(precision);
  const fixed = value.toFixed(clamped);
  if (clamped === 0) return fixed;
  return fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function isBase(value: unknown): value is Base {
  return value === 'si' || value === 'binary';
}

export function isValidUnit(value: unknown): value is FieldUnit {
  return (
    (typeof value === 'string' && (['bit', 'kbit', 'Mbit', 'Gbit'] as string[]).includes(value)) ||
    [...SI_UNITS, ...BINARY_UNITS].some((u) => u.symbol === value)
  );
}

/**
 * Convert a value from one unit to bytes then to every selectable unit.
 * Returns a map of results in bytes-derived units; bit units included.
 */
export function convertAll(base: Base, fromUnit: FieldUnit, value: number): Record<string, number> {
  const fromDef = unitBySymbol(base, fromUnit);
  if (!fromDef) return {};
  const bytes = value * fromDef.bytesPerUnit;
  const results: Record<string, number> = {};
  for (const unit of selectableUnits(base)) {
    results[unit.symbol] = bytes / unit.bytesPerUnit;
  }
  return results;
}

/** Build the plain-language human summary, e.g. "1536 MiB is 1.5 GiB or about 1.61 GB". */
/** Smallest rung (from top) whose value is at least 1; falls back to bytes. */
function naturalUnit(units: UnitDef[], bytes: number): UnitDef {
  for (let i = units.length - 1; i >= 1; i -= 1) {
    const unit = units[i];
    if (unit && Math.abs(bytes / unit.bytesPerUnit) >= 1) return unit;
  }
  return units[0] as UnitDef;
}

/** Bump precision just enough that a sub-1 value does not render as "0". */
export function precisionFor(value: number, precision: number): number {
  let eff = clampPrecision(precision);
  let text = formatWithPrecision(value, eff);
  while (Number(text) === 0 && Math.abs(value) > 0 && eff < MAX_PRECISION) {
    eff += 1;
    text = formatWithPrecision(value, eff);
  }
  return eff;
}

export function humanSummary(
  base: Base,
  fromUnit: FieldUnit,
  value: number,
  precision: number
): string | null {
  const fromDef = unitBySymbol(base, fromUnit);
  if (!fromDef) return null;
  const bytes = value * fromDef.bytesPerUnit;
  const units = unitsForBase(base);
  const sourceIndex = units.findIndex((u) => u.symbol === (fromUnit as UnitSymbol));
  const natural = naturalUnit(units, bytes);
  const fallback = units[sourceIndex + 1] ?? units[units.length - 1];
  if (!fallback) return null;
  const target = natural.symbol === fromDef.symbol ? fallback : natural;
  const inTarget = bytes / target.bytesPerUnit;
  const summary = `${formatWithPrecision(value, precision)} ${fromDef.symbol} is ${formatWithPrecision(
    inTarget,
    precisionFor(inTarget, precision)
  )} ${target.symbol}`;
  const otherUnits = base === 'si' ? BINARY_UNITS : SI_UNITS;
  const other = naturalUnit(otherUnits, bytes);
  if (other.symbol !== fromDef.symbol && other.symbol !== target.symbol) {
    const inOther = bytes / other.bytesPerUnit;
    return `${summary} or about ${formatWithPrecision(
      inOther,
      precisionFor(inOther, precision)
    )} ${other.symbol}`;
  }
  return summary;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  const value = parseNumber(state.inputValue);
  if (value === null) {
    return 'File Size Converter: enter a valid number';
  }
  const summary = humanSummary(state.base, state.inputUnit, value, state.precision);
  return summary === null ? 'File Size Converter: invalid unit' : summary;
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}
