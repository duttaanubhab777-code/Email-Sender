const P = {
    home: (
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    ),
    send: (
        <>
            <path d="m22 2-7 20-4-9-9-4 20-7Z" />
            <path d="M22 2 11 13" />
        </>
    ),
    mail: (
        <>
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-10 6L2 7" />
        </>
    ),
    key: (
        <>
            <circle cx="7.5" cy="15.5" r="4.5" />
            <path d="m10.7 12.3 9.8-9.8M16 7l3 3M14 9l2.5 2.5" />
        </>
    ),
    user: (
        <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </>
    ),
    users: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </>
    ),
    userPlus: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M19 8v6M22 11h-6" />
        </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    shieldCheck: (
        <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </>
    ),
    lock: (
        <>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </>
    ),
    unlock: (
        <>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </>
    ),
    eye: (
        <>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    eyeOff: (
        <>
            <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2M10.7 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a13.2 13.2 0 0 1-1.7 2.7M6.6 6.6A13.5 13.5 0 0 0 2 12s3 7 10 7a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20" />
        </>
    ),
    copy: (
        <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    trash: (
        <>
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
        </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
        <>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </>
    ),
    logout: (
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    ),
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4" />
        </>
    ),
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    alert: (
        <>
            <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
            <path d="M12 9v4M12 17h.01" />
        </>
    ),
    info: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
        </>
    ),
    checkCircle: (
        <>
            <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
            <path d="m9 11 3 3L22 4" />
        </>
    ),
    xCircle: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="m15 9-6 6M9 9l6 6" />
        </>
    ),
    clock: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
        </>
    ),
    camera: (
        <>
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3" />
        </>
    ),
    activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    dots: (
        <>
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
        </>
    ),
    refresh: (
        <>
            <path d="M3 12a9 9 0 0 1 9-9 9.8 9.8 0 0 1 6.7 2.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.8 9.8 0 0 1-6.7-2.7L3 16M8 16H3v5" />
        </>
    ),
    external: (
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    ),
    code: <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />,
    terminal: <path d="m4 17 6-6-6-6M12 19h8" />,
    power: <path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10" />,
    inbox: (
        <>
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
        </>
    ),
    grid: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
        </>
    ),
    crown: <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zM5 20h14" />,
    ban: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="m4.9 4.9 14.2 14.2" />
        </>
    ),
    globe: (
        <>
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </>
    ),
    arrowRight: <path d="M5 12h14m-7-7 7 7-7 7" />,
    bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
    database: (
        <>
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" />
        </>
    ),
    filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z" />,
    edit: (
        <>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </>
    ),
    more: (
        <>
            <circle cx="5" cy="12" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
        </>
    )
};

export default function Icon({
    name,
    size = 18,
    className = "",
    strokeWidth = 2
}) {
    return (
        <svg
            className={`icon ${className}`}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {P[name]}
        </svg>
    );
}
