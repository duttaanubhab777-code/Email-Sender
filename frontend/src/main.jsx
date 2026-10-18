import "./lib/pwa"; // beforeinstallprompt ইভেন্ট ধরতে সবার আগে
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css"; // design tokens + shared primitives (button, form, card, modal ...)
import "./styles/app.css"; // console layout + page styles (shell, auth, dashboard, admin, kill switch ...)
import "./styles/extra.css"; // blue + orange polish: animated backdrop, loader, watermark
import "./styles/code.css"; // VS Code Dark+/Light+ colours for code boxes (must come after extra.css)
import "./styles/gradient-theme.css"; // blue↔orange gradients, status colours, red notifications + kill switch, graph + quota ring
import "./styles/polish.css"; // green = right / red = wrong everywhere, code-box expand, docs links (must be last)
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "./lib/push";
import Backdrop from "./components/Backdrop";
import Watermark from "./components/Watermark";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <Backdrop />
                        <App />
                        <Watermark />
                    </AuthProvider>
                </ToastProvider>
            </ThemeProvider>
        </BrowserRouter>
    </React.StrictMode>
);

// PWA: service worker চালু (install + offline + push) — লগইন পেজেও দরকার, তাই একদম শুরুতে
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => registerSW());
}
