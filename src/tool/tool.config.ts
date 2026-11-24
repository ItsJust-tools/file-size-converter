import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'file-size-converter',
  name: 'File Size Converter',
  description:
    'Convert between digital file size units (bits, bytes, KB/MB/GB/TB, KiB/MiB/GiB/TiB) with instant bidirectional input, both SI and binary bases and copyable results.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.12)',
    brand: 'File Size Converter',
    icon: '💾',
  },
  shortcuts: [
    {
      title: 'Converter',
      shortcuts: [
        { keys: 'B', label: 'Toggle base', description: 'switch between SI and binary/IEC bases' },
        { keys: 'C', label: 'Copy result', description: 'copy the human summary to the clipboard' },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
