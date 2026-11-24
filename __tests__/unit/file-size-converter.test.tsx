import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import {
  BIT_UNITS,
  BINARY_UNITS,
  DEFAULT_STATE,
  SI_UNITS,
  clampPrecision,
  convertAll,
  formatWithPrecision,
  humanSummary,
  isValidUnit,
  parseNumber,
  selectableUnits,
  summaryText,
  unitBySymbol,
  unitsForBase,
  type FieldUnit,
  type ToolState,
} from '@/tool/types';
import {
  deserializeState,
  fileSizeConverterTool,
  paramsFromState,
  roundTrips,
  serializeState,
  stateFromParams,
  withHistory,
} from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { BASES } from '@/tool/ui-shared';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseNumber', () => {
  it('parses integers, decimals, signs and exponents', () => {
    expect(parseNumber('1536')).toBe(1536);
    expect(parseNumber('-3.5')).toBe(-3.5);
    expect(parseNumber('.5')).toBeCloseTo(0.5);
    expect(parseNumber('1e3')).toBe(1000);
  });

  it('rejects invalid input', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('  ')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
  });
});

describe('clampPrecision', () => {
  it('clamps to 0-8 and rounds', () => {
    expect(clampPrecision(-5)).toBe(0);
    expect(clampPrecision(99)).toBe(8);
    expect(clampPrecision(2.6)).toBe(3);
    expect(clampPrecision(3)).toBe(3);
  });

  it('falls back to default for non-finite input', () => {
    expect(clampPrecision(Number.NaN)).toBe(DEFAULT_STATE.precision);
  });
});

describe('formatWithPrecision', () => {
  it('formats with fixed decimals and trims trailing zeros', () => {
    expect(formatWithPrecision(1.5, 2)).toBe('1.5');
    expect(formatWithPrecision(1.5, 0)).toBe('2');
    expect(formatWithPrecision(1.23456, 4)).toBe('1.2346');
    expect(formatWithPrecision(2, 3)).toBe('2');
  });

  it('handles non-finite values', () => {
    expect(formatWithPrecision(Number.NaN, 2)).toBe('—');
    expect(formatWithPrecision(Infinity, 2)).toBe('—');
  });
});

describe('unit tables', () => {
  it('expose SI and binary ladders in order', () => {
    expect(SI_UNITS.map((u) => u.symbol)).toEqual(['B', 'KB', 'MB', 'GB', 'TB', 'PB']);
    expect(BINARY_UNITS.map((u) => u.symbol)).toEqual(['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']);
    expect(unitsForBase('si')).toBe(SI_UNITS);
    expect(unitsForBase('binary')).toBe(BINARY_UNITS);
    expect(BINARY_UNITS[3]?.bytesPerUnit).toBe(1024 ** 3);
    expect(SI_UNITS[3]?.bytesPerUnit).toBe(1e9);
  });

  it('selectable units include bits and byte units but not B twice', () => {
    const units = selectableUnits('si');
    expect(units[0]).toEqual(BIT_UNITS[0]);
    expect(units.filter((u) => u.symbol === 'B')).toHaveLength(1);
    expect(units.map((u) => u.symbol)).toContain('Gbit');
    expect(units.map((u) => u.symbol)).toContain('PB');
  });

  it('resolves units by symbol', () => {
    expect(unitBySymbol('binary', 'MiB')?.bytesPerUnit).toBe(1024 ** 2);
    expect(unitBySymbol('si', 'bit')?.bytesPerUnit).toBe(1 / 8);
    expect(unitBySymbol('si', 'kbit')?.bytesPerUnit).toBe(125);
    expect(unitBySymbol('si', 'nope' as unknown as FieldUnit)).toBeNull();
  });

  it('validates unit strings', () => {
    expect(isValidUnit('MiB')).toBe(true);
    expect(isValidUnit('Mbit')).toBe(true);
    expect(isValidUnit('TiB')).toBe(true);
    expect(isValidUnit('bogus')).toBe(false);
    expect(isValidUnit(42)).toBe(false);
  });
});

describe('convertAll', () => {
  it('converts one field into every other field with correct SI values', () => {
    const results = convertAll('si', 'GB', 1);
    expect(results['MB']).toBeCloseTo(1000);
    expect(results['KB']).toBeCloseTo(1e6);
    expect(results['B']).toBeCloseTo(1e9);
    expect(results['TB']).toBeCloseTo(0.001);
    expect(results['bit']).toBeCloseTo(8e9);
    expect(results['Gbit']).toBeCloseTo(8);
  });

  it('converts binary values (1536 MiB = 1.5 GiB)', () => {
    const results = convertAll('binary', 'MiB', 1536);
    expect(results['GiB']).toBeCloseTo(1.5);
    expect(results['TiB']).toBeCloseTo(1.5 / 1024);
    expect(results['B']).toBeCloseTo(1536 * 1024 ** 2);
  });

  it('returns an empty map for unknown units', () => {
    expect(convertAll('si', 'nope' as never, 1)).toEqual({});
  });
});

describe('humanSummary', () => {
  it('writes the plain-language line in the active base', () => {
    expect(humanSummary('binary', 'MiB', 1536, 2)).toBe('1536 MiB is 1.5 GiB or about 1.61 GB');
    expect(humanSummary('si', 'MB', 1, 2)).toBe('1 MB is 0.001 GB or about 976.56 KiB');
  });

  it('keeps the summary deterministic in both bases', () => {
    expect(humanSummary('si', 'B', 10, 2)).toBe('10 B is 0.01 KB');
    expect(humanSummary('binary', 'B', 2048, 2)).toBe('2048 B is 2 KiB or about 2.05 KB');
  });

  it('returns null for unknown units', () => {
    expect(humanSummary('si', 'nope' as never, 1, 2)).toBeNull();
  });
});

describe('summaryText', () => {
  it('summarizes valid state and flags invalid input', () => {
    expect(summaryText(state({ inputUnit: 'MiB', inputValue: '1536', base: 'binary' }))).toBe(
      '1536 MiB is 1.5 GiB or about 1.61 GB'
    );
    expect(summaryText(state())).toBe('1 MB is 0.001 GB or about 976.56 KiB');
    expect(summaryText(state({ inputValue: 'oops' }))).toBe(
      'File Size Converter: enter a valid number'
    );
  });
});

describe('serialize / deserialize', () => {
  it('round-trips full state', () => {
    const s = state({ inputUnit: 'TiB', inputValue: '12.5', base: 'binary', precision: 5 });
    expect(roundTrips(s)).toBe(true);
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored).toEqual({ success: true, data: s });
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope')).toEqual({
      success: false,
      error: 'Invalid data format: expected file size converter state object',
    });
    expect(deserializeState([1, 2]).success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
  });

  it('repairs invalid fields with defaults', () => {
    const repaired = deserializeState({
      inputUnit: 'bogus',
      inputValue: 42,
      base: 'quux',
      precision: 'seventy',
      history: 'not-a-list',
    });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.inputUnit).toBe(DEFAULT_STATE.inputUnit);
      expect(repaired.data.inputValue).toBe(DEFAULT_STATE.inputValue);
      expect(repaired.data.base).toBe(DEFAULT_STATE.base);
      expect(repaired.data.precision).toBe(DEFAULT_STATE.precision);
      expect(repaired.data.history).toEqual([]);
    }
  });

  it('clamps out-of-range precision and caps history length', () => {
    const repaired = deserializeState({ precision: 400, history: [] });
    expect(repaired.success).toBe(true);
    if (repaired.success) expect(repaired.data.precision).toBe(8);

    let long: ToolState = state();
    for (let i = 0; i < 30; i += 1) {
      long = withHistory(long, `entry ${i}`, new Date(2026, 0, 1));
    }
    expect(long.history).toHaveLength(20);
  });

  it('exposes a tool object wired to the config', () => {
    expect(fileSizeConverterTool.id).toBe('file-size-converter');
    expect(fileSizeConverterTool.initialState).toEqual(DEFAULT_STATE);
    expect(fileSizeConverterTool.serialize(state())).toContain('"inputValue":"1"');
  });
});

describe('URL state', () => {
  it('serializes state into params and back', () => {
    const s = state({ inputUnit: 'GiB', inputValue: '4', base: 'binary', precision: 4 });
    const params = paramsFromState(s);
    expect(params.get('unit')).toBe('GiB');
    expect(params.get('base')).toBe('binary');
    const restored = stateFromParams(params);
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data).toEqual(s);
    }
  });

  it('deserializes partial params onto defaults', () => {
    const restored = stateFromParams(new URLSearchParams('value=2048&base=binary'));
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.inputValue).toBe('2048');
      expect(restored.data.base).toBe('binary');
      expect(restored.data.inputUnit).toBe(DEFAULT_STATE.inputUnit);
    }
  });

  it('fails when no params are present', () => {
    expect(stateFromParams(new URLSearchParams('')).success).toBe(false);
  });
});

describe('Canvas bidirectional conversion', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('typing in one field updates every other field', () => {
    render(<Canvas state={state({ inputUnit: 'MB', inputValue: '500' })} onChange={onChange} />);

    const input = screen.getByTestId('input-value');
    fireEvent.change(input, { target: { value: '1000' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]?.[0] as ToolState;
    expect(next.inputValue).toBe('1000');

    // Rerender with the updated state to verify all fields recomputed.
    cleanup();
    render(<Canvas state={next} onChange={onChange} />);
    expect(screen.getByTestId('result-MB')).toHaveTextContent('1000');
    expect(screen.getByTestId('result-GB')).toHaveTextContent('1');
    expect(screen.getByTestId('result-KB')).toHaveTextContent('1000000');
    expect(screen.getByTestId('result-bit')).toHaveTextContent('8000000000');
    expect(screen.getByTestId('result-Gbit')).toHaveTextContent('8');
  });

  it('toggling base from SI to binary recomputes fields (1536 MiB shows 1.5 GiB)', () => {
    const binaryState = state({
      inputUnit: 'MiB',
      inputValue: '1536',
      base: 'binary',
    });
    render(<Canvas state={binaryState} onChange={onChange} />);

    expect(screen.getByTestId('result-GiB')).toHaveTextContent('1.5');
    expect(screen.getByTestId('summary-text')).toHaveTextContent('1536 MiB is 1.5 GiB');
    expect(screen.getByTestId('result-MiB')).toHaveTextContent('1536');

    fireEvent.click(screen.getByTestId('base-tab-si'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ base: 'si' }));
    const siState = onChange.mock.calls[0]?.[0] as ToolState;
    cleanup();
    render(<Canvas state={siState} onChange={onChange} />);
    // Same byte count expressed in SI units: 1536 MiB ≈ 1.611 GB
    expect(screen.getByTestId('result-GB')).toHaveTextContent('1.61');
  });

  it('updates the unit when the select changes', () => {
    render(<Canvas state={state()} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('input-unit'), { target: { value: 'GB' } });
    expect(onChange).toHaveBeenCalled();
    const calls = onChange.mock.calls;
    const last = calls[calls.length - 1]?.[0] as ToolState | undefined;
    expect(last?.inputUnit).toBe('GB');
  });

  it('saves history entries via the save button', () => {
    const onSaveHistory = vi.fn();
    render(<Canvas state={state()} onChange={onChange} onSaveHistory={onSaveHistory} />);
    fireEvent.click(screen.getByTestId('btn-save-history'));
    expect(onSaveHistory).toHaveBeenCalledWith('1 MB is 0.001 GB or about 976.56 KiB');
  });

  it('shows placeholder when the value is invalid', () => {
    render(<Canvas state={state({ inputValue: 'abc' })} onChange={onChange} />);
    expect(screen.getByTestId('summary-text')).toHaveTextContent('Enter a valid number');
    expect(screen.getByTestId('result-KB')).toHaveTextContent('—');
  });

  it('copies a result and clears the copied confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      writable: true,
      value: { writeText },
    });
    render(<Canvas state={state()} onChange={onChange} />);
    const copyButton = screen.getByTestId('copy-GB');
    fireEvent.click(copyButton);
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith('0.001');
    await waitFor(() => expect(screen.getByTestId('copy-GB')).toHaveTextContent('Copy'), {
      timeout: 3000,
    });
  });

  it('renders history list and empty state', () => {
    const filled = withHistory(state(), '1 MB is 0.001 GB', new Date(2026, 0, 1));
    const { unmount } = render(<Canvas state={filled} onChange={onChange} />);
    expect(screen.getByTestId('history-list')).toBeInTheDocument();
    expect(screen.getByText('1 MB is 0.001 GB')).toBeInTheDocument();
    unmount();
    render(<Canvas state={state()} onChange={onChange} />);
    expect(screen.getByTestId('history-empty')).toBeInTheDocument();
  });
});

describe('Toolbar precision control', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('changes rounding of displayed values via the precision slider', () => {
    const s = state({ inputUnit: 'MiB', inputValue: '1536', base: 'binary', precision: 2 });
    render(<Toolbar state={s} onChange={onChange} onClear={() => {}} />);

    const slider = screen.getByTestId('precision-slider') as HTMLInputElement;
    expect(slider.value).toBe('2');
    fireEvent.change(slider, { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ precision: 5 }));

    // Rerender canvas with precision 5: 1536 MiB = 1610612736 B → 1.61 GB (SI)
    render(<Canvas state={{ ...s, precision: 5 }} onChange={onChange} />);
    expect(screen.getByTestId('result-GiB')).toBeInTheDocument();
  });

  it('precision changes reformat all displayed values', () => {
    const s = state({ inputUnit: 'MB', inputValue: '1', base: 'si', precision: 2 });
    const { rerender } = render(<Canvas state={s} onChange={onChange} />);
    expect(screen.getByTestId('result-GB')).toHaveTextContent('0.001');
    rerender(<Canvas state={{ ...s, precision: 6 }} onChange={onChange} />);
    const gb = () => screen.getByTestId('result-GB');
    expect(gb()).toHaveTextContent('0.001');
    rerender(<Canvas state={{ ...s, inputUnit: 'KB', inputValue: '1534' }} onChange={onChange} />);
    expect(gb()).toHaveTextContent('0.002');
    rerender(
      <Canvas
        state={{ ...s, inputUnit: 'KB', inputValue: '1534', precision: 0 }}
        onChange={onChange}
      />
    );
    expect(gb()).toHaveTextContent('0.002');
  });

  it('clears input and history and validates slider bounds', () => {
    const onClear = vi.fn();
    render(
      <Toolbar
        state={state({ history: [{ text: 'x', createdAt: 't' }] })}
        onChange={onChange}
        onClear={onClear}
      />
    );
    const slider = screen.getByTestId('precision-slider') as HTMLInputElement;
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('8');
    fireEvent.click(screen.getByTestId('btn-clear'));
    expect(onClear).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('btn-clear-history'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ history: [] }));
  });
});

describe('Sidebar base switching', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
  });

  it('switches base from the sidebar lists', () => {
    render(<Sidebar state={state()} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('sidebar-base-binary'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ base: 'binary' }));
    expect(screen.getByTestId('sidebar-history-count')).toHaveTextContent('0 entries in history');
  });

  it('shows the unit ladder for the active base', () => {
    render(<Sidebar state={state({ base: 'binary' })} onChange={onChange} />);
    expect(screen.getByText('GiB')).toBeInTheDocument();
    expect(screen.getByText(/pebibyte/i)).toBeInTheDocument();
  });
});

describe('BASES metadata', () => {
  it('describes both bases', () => {
    expect(BASES.map((b) => b.value)).toEqual(['si', 'binary']);
    expect(BASES[1]?.label).toContain('1024');
  });
});
