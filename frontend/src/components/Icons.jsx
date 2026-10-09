// কাস্টম SVG আইকন — ইমোজির বদলে। হোভারে .icon-anim ক্লাস দিলে অ্যানিমেট হবে।
const PATHS = {
  mail: (<><rect x="3" y="5" width="18" height="14" rx="3.5" /><path className="ic-draw" d="m4 7.5 8 5.8 8-5.8" /></>),
  key: (<><circle cx="8" cy="15.5" r="4" /><path d="m11 12.5 8.5-8.5M16 7l3 3M14 9l2 2" /></>),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2.8" /><path d="M5 15V7a3 3 0 0 1 3-3h8" /></>),
  check: <path className="ic-draw" d="m5 12.5 4.5 4.5L19 7" />,
  trash: (<><path d="M4 7h16M10 11v6M14 11v6" /><path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4.5h6V7" /></>),
  logout: (<><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path className="ic-nudge" d="m10 8-4 4 4 4M6 12h10" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>),
  users: (<><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14a6 6 0 0 1 3 5.5" /></>),
  shield: (<><path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.900 7-5.300 7-9.500V6l-7-3Z" /><path className="ic-draw" d="m9 12 2.200 2.200L15.500 10" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  send: (<><path d="m21 3-9.500 18-2.500-8L1 10.500 21 3Z" transform="translate(1 0)" /><path d="M21.500 3 9 13" transform="translate(1 0)" /></>),
  eye: (<><path d="M2 12s3.600-6.500 10-6.500S22 12 22 12s-3.600 6.500-10 6.500S2 12 2 12Z" /><circle cx="12" cy="12" r="2.800" /></>),
  eyeOff: (<><path d="M3 3l18 18M10.600 6a9 9 0 0 1 1.400-.1c6.400 0 10 6.100 10 6.100a17 17 0 0 1-3.100 3.700M6.600 7.200A16 16 0 0 0 2 12s3.600 6.500 10 6.500c1.600 0 3-.4 4.200-1" /><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200" /></>),
  lock: (<><rect x="4.500" y="10.500" width="15" height="10" rx="3" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" /></>),
  camera: (<><path d="M4 8h3l1.500-2.500h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.500" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5.500l3.500 2" /></>),
  globe: (<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.600 2.600 3.900 5.600 3.900 9S14.600 18.400 12 21c-2.600-2.600-3.900-5.600-3.900-9S9.400 5.600 12 3Z" /></>),
  activity: <path d="M3 12h4l2.500-6 4 12 2.500-6H21" />,
  alert: (<><path d="M12 3.500 2.500 20h19L12 3.500Z" /><path d="M12 10v4.500M12 17.500v.1" /></>),
  home: (<><path d="M3.500 11 12 4l8.500 7" /><path d="M5.500 9.500V20h13V9.500M10 20v-5.500h4V20" /></>),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.500 2.500M15.500 15.500 18 18M18 6l-2.500 2.500M8.500 15.500 6 18" />,
  terminal: (<><rect x="3" y="4.500" width="18" height="15" rx="3" /><path d="m7.500 10 3 2.500-3 2.500M13 15h4" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2.500v2.500M12 19v2.500M2.500 12H5M19 12h2.500M5.300 5.300l1.800 1.800M16.900 16.900l1.800 1.800M18.700 5.300l-1.800 1.800M7.100 16.900l-1.800 1.800" /></>),
  moon: <path d="M20 14.500A8.500 8.500 0 0 1 9.500 4 8.500 8.500 0 1 0 20 14.500Z" />,
  edit: (<><path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16v4Z" /><path d="m13.500 6.500 4 4" /></>)
};

export default function Icon({ name, size = 20, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
