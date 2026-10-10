import ThemeToggle from "../../components/ThemeToggle";
import { LogoFull } from "../../components/Logo";
import Icon from "../../components/Icons";

// বাঁ দিকে প্রোডাক্টের আসল কাজ (একটা request -> email), ডান দিকে ফর্ম
export default function AuthLayout({ children }) {
    return (
        <div className="auth">
            <section className="auth-art" aria-hidden="true">
                <span className="logo-tile">
                    <LogoFull width={168} />
                </span>
                <div>
                    <h2>
                        Point your form at one endpoint. Get every message in
                        your inbox.
                    </h2>
                    <p className="lead">
                        Create an API key, paste the snippet into your site, and
                        Email Sender delivers each submission to you. No mail
                        server to run.
                    </p>
                </div>
                <div className="req-card">
                    <div className="bar-top">
                        <span className="verb">POST</span>
                        <span>/api/v1/mail/send</span>
                    </div>
                    <pre>
                        {`{
  `}
                        <span className="k">"access_key"</span>
                        {`: `}
                        <span className="s">"Anubhab_email_sndr_••••"</span>
                        {`,
  `}
                        <span className="k">"name"</span>
                        {`:    `}
                        <span className="s">"Anubhab Dutta"</span>
                        {`,
  `}
                        <span className="k">"email"</span>
                        {`:   `}
                        <span className="s">"Anubhab@example.com"</span>
                        {`,
  `}
                        <span className="k">"subject"</span>
                        {`: `}
                        <span className="s">"Project enquiry"</span>
                        {`,
  `}
                        <span className="k">"message"</span>
                        {`: `}
                        <span className="s">"Hi, are you free this week?"</span>
                        {`
}`}
                    </pre>
                    <div className="resp">
                        <span className="ok">
                            <Icon name="check" size={13} strokeWidth={3} />
                        </span>{" "}
                        200 · Email processed and logged successfully
                    </div>
                </div>
                <small>Email Sender · contact form API</small>
            </section>

            <main className="auth-main">
                <div className="auth-top">
                    <ThemeToggle />
                </div>
                <div className="auth-card">
                    <div className="mob-brand">
                        <LogoFull width={150} />
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
