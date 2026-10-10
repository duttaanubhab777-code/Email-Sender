import { LogoMark } from "../Logo";

export default function Splash({ text = "Loading…" }) {
    return (
        <div className="splash">
            <div className="splash-in">
                <LogoMark size={56} />
                <span>{text}</span>
            </div>
        </div>
    );
}
