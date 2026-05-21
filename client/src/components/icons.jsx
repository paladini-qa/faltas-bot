const wrap = (path) => ({ className = '', size, style } = {}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ width: size || 16, height: size || 16, display: 'block', ...style }}
  >
    {path}
  </svg>
);

export const Home     = wrap(<><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></>);
export const Users    = wrap(<><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M21 19c0-2.3-1.7-4.5-4-5"/></>);
export const FileIcon = wrap(<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M10 13h7M10 17h5"/></>);
export const Bell     = wrap(<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2H4.5L6 16z"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
export const Inbox    = wrap(<><path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6"/><path d="M8 13h2a2 2 0 0 0 4 0h2"/></>);
export const Cog      = wrap(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.7 1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>);
export const Search   = wrap(<><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.6-3.6"/></>);
export const Plus     = wrap(<><path d="M12 5v14M5 12h14"/></>);
export const Check    = wrap(<><path d="M5 12l5 5L20 7"/></>);
export const X        = wrap(<><path d="M6 6l12 12M18 6L6 18"/></>);
export const Send     = wrap(<><path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></>);
export const Upload   = wrap(<><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>);
export const Download = wrap(<><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></>);
export const Trash    = wrap(<><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></>);
export const User     = wrap(<><circle cx="12" cy="8" r="3.5"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>);
export const UserPlus = wrap(<><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M19 8v6M16 11h6"/></>);
export const Phone    = wrap(<><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/></>);
export const Mail     = wrap(<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>);
export const Chevron  = wrap(<><path d="m9 6 6 6-6 6"/></>);
export const Filter   = wrap(<><path d="M3 5h18l-7 9v6l-4-2v-4z"/></>);
export const Calendar = wrap(<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>);
export const Wand     = wrap(<><path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l11-11"/><path d="m12 11 1 1"/></>);
export const Eye      = wrap(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>);
export const AlertOct = wrap(<><path d="M7.7 3h8.6L21 7.7v8.6L16.3 21H7.7L3 16.3V7.7z"/><path d="M12 8v5M12 16.5v.1"/></>);
export const Clock    = wrap(<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>);
export const Sparkle  = wrap(<><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/></>);
export const Tag      = wrap(<><path d="M3 12V4h8l10 10-8 8z"/><circle cx="8" cy="8" r="1.3"/></>);
export const Whatsapp = wrap(<><path d="M3 21l1.7-5.1A8.5 8.5 0 1 1 8.1 19.3z"/><path d="M9 9c0-.5.4-1 1-1h.5l1 2-1 1a5 5 0 0 0 2.5 2.5l1-1 2 1V14c0 .5-.5 1-1 1A6 6 0 0 1 9 9z"/></>);
export const Lightning= wrap(<><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></>);
export const Check2   = wrap(<><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>);
export const Grid     = wrap(<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>);
export const List     = wrap(<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>);
export const Arrow    = wrap(<><path d="M5 12h14M13 5l7 7-7 7"/></>);
export const Refresh  = wrap(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>);
export const Dot      = wrap(<><circle cx="12" cy="12" r="2.2"/></>);
export const QR       = wrap(<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v3M14 21h3"/></>);
export const HelpCircle = wrap(<><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>);
export const BookOpen   = wrap(<><path d="M2 7a2 2 0 0 1 2-2h7v16H4a2 2 0 0 1-2-2z"/><path d="M22 7a2 2 0 0 0-2-2h-7v16h7a2 2 0 0 0 2-2z"/><path d="M12 5v16"/></>);
