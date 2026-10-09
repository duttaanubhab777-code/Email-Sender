import { useTheme } from "../context/ThemeContext";
import Icon from "./Icons";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button className="theme-toggle" onClick={toggle} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      <Icon name="sun" className="sun" size={20} />
      <Icon name="moon" className="moon" size={20} />
    </button>
  );
}
