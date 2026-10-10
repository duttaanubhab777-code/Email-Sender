export const normEmail = v => String(v ?? "").trim().toLowerCase();

export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// jarvis@gmail.com -> ja*****@gmail.com
export const maskEmail = email => {
    const [name, domain] = String(email).split("@");
    return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};

export const isYes = v => String(v ?? "").trim().toLowerCase() === "yes";
