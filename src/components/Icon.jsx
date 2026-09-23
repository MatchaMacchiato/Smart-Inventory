const paths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  box: 'm12 3 9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v8 M7.5 5.5l9 5',
  layers: 'm12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5',
  truck: 'M1 4h13v13H1z M14 9h4l4 4v4h-8 M5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 0 4',
  chart: 'M3 3v18h18 M7 15l4-5 4 3 6-8',
  wallet: 'M3 6V4h16v4 M3 8h18v13H3z M16 12h5v5h-5z',
  down: 'M12 3v14 m-6-6 6 6 6-6 M4 17v4h16v-4',
  up: 'M12 17V3 m-6 6 6-6 6 6 M4 17v4h16v-4',
  arrow: 'M4 12h16 m-6-6 6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  plus: 'M12 5v14 M5 12h14',
  close: 'm6 6 12 12 M6 18 18 6',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  alert: 'm12 3 10 18H2z M12 9v5 M12 17v.1',
  check: 'm5 12 4 4L19 6',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
  file: 'M14 2H4v20h16V8z M14 2v6h6 M8 13h8 M8 17h6',
  scan: 'M8 3H3v5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M7 12h10',
  tool: 'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M7 7h10v10H7z M10 10h4v4h-4z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
};

export default function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.box} /></svg>;
}
