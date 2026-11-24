import { DEFAULT_STATE, isBase, type Base, type ToolState } from './types';

/** User-facing copy for the two bases. */
export const BASES: { value: Base; label: string; hint: string }[] = [
  { value: 'si', label: 'SI (1000)', hint: 'decimal KB, MB, GB, TB, PB' },
  { value: 'binary', label: 'Binary (1024)', hint: 'IEC KiB, MiB, GiB, TiB, PiB' },
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.inputValue === 'string' &&
    isBase(v.base) &&
    typeof v.precision === 'number' &&
    DEFAULT_STATE !== undefined
  );
}
