import logoMark from "../assets/logo-mark.png";
import logoFull from "../assets/logo-full.png";

// শুধু আইকন (এনভেলপ + প্লেন)
export function LogoMark({ size = 40, className = "" }) {
  return <img src={logoMark} width={size} height={size} alt="Email Sender" className={`logo-mark ${className}`} draggable="false" />;
}

// আইকন + "EMAIL SENDER" লেখা সহ পুরো লোগো
export function LogoFull({ width = 210, className = "" }) {
  return <img src={logoFull} style={{ width }} alt="Email Sender" className={`logo-full ${className}`} draggable="false" />;
}
