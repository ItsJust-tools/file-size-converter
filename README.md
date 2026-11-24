# File Size Converter

Convert between digital file size units — bits, bytes, kilobits, and the SI (KB/MB/GB/TB/PB) and binary IEC (KiB/MiB/GiB/TiB/PiB) families — with instant bidirectional conversion in both bases.

**Live:** [file-size-converter.itsjust.tools](https://file-size-converter.itsjust.tools)

## Features

- Bidirectional input: pick any unit, type a value, and every other unit updates instantly
- Switch between SI (1000-based: KB, MB, GB, TB, PB) and binary/IEC (1024-based: KiB, MiB, GiB, TiB, PiB) bases
- Bits, bytes, kilobits, megabits and gigabits available as source and target units
- Configurable decimal precision (0–8 digits) applied to every displayed value
- Plain-language human summary line, e.g. `1536 MiB is 1.5 GiB or about 1.61 GB`
- URL state sharing so the value, unit, base and precision survive reload and can be shared
- Copy any result with one click and a temporary copied confirmation per field
- Quick reference unit ladder from 1 byte to 1 PB/PiB in the selected base
- Keyboard accessible fields with labels and live region announcements
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves your browser

## Keyboard shortcuts

| Key | Action                |
| --- | --------------------- |
| `B` | Toggle SI/binary base |
| `C` | Copy summary          |

## Development

```bash
npm install
npm run build -w @itsjust/core   # build shared core first
npm run dev
npm test
```

## Deployment

```bash
docker build -t itsjust-file-size-converter .
docker run -p 3000:3000 itsjust-file-size-converter
```

## License

MIT
