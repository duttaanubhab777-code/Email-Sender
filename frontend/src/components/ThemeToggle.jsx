import { useTheme } from "../context/ThemeContext";
import Icon from "./Icons";

export default function ThemeToggle() {
    const { theme, toggle } = useTheme();
    const next = theme === "dark" ? "light" : "dark";
    return (
        <button
            className="btn-icon bordered"
            onClick={toggle}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
        >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={17} />
        </button>
    );
}
