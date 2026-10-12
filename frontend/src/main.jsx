import "./lib/pwa"; // beforeinstallprompt ইভেন্ট ধরতে সবার আগে
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css"; // design tokens + shared primitives (button, form, card, modal ...)
import "./styles/app.css"; // console layout + page styles (shell, auth, dashboard, admin, kill switch ...)
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import { ThemeProvider } from "./context/ThemeContext";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "./lib/push";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <BrowserRouter>
            <ThemeProvider>
                <ToastProvider>
                    <AuthProvider>
                        <App />
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
