import logoMark from "../assets/logo-mark.png";
import logoFull from "../assets/logo-full.png";

export function LogoMark({ size = 32, className = "" }) {
    return (
        <img
            src={logoMark}
            width={size}
            height={size}
            alt="Email Sender"
            className={className}
            draggable="false"
            style={{ objectFit: "contain", display: "block" }}
        />
    );
}

export function LogoFull({ width = 150, className = "" }) {
    return (
        <img
            src={logoFull}
            style={{ width, height: "auto", display: "block" }}
            alt="Email Sender"
            className={className}
            draggable="false"
        />
    );
}

export function Brand({ size = 30 }) {
    return (
        <span className="row" style={{ gap: 9 }}>
            <LogoMark size={size} />
            <span className="brand-name">
                Email<b>Sender</b>
            </span>
        </span>
    );
}
