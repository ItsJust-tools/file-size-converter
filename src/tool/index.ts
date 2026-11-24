export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './template-metadata';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  fileSizeConverterTool,
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  stateFromParams,
  paramsFromState,
  numberOrNull,
} from './tool-definition';
export { Canvas } from './components/Canvas';
export { Sidebar } from './components/Sidebar';
export { Toolbar } from './components/Toolbar';
export { BASES, isState } from './ui-shared';
export {
  DEFAULT_STATE,
  MAX_HISTORY,
  MIN_PRECISION,
  MAX_PRECISION,
  BIT_UNITS,
  SI_UNITS,
  BINARY_UNITS,
  parseNumber,
  clampPrecision,
  formatWithPrecision,
  precisionFor,
  convertAll,
  humanSummary,
  summaryText,
  historyText,
  unitsForBase,
  selectableUnits,
  unitBySymbol,
  isValidUnit,
} from './types';
export type { Base, FieldUnit, HistoryEntry, ToolState, UnitDef, UnitSymbol } from './types';
