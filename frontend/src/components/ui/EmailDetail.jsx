import { useState } from "react";
import Icon from "../Icons";
import Avatar from "../Avatar";
import Drawer from "./Drawer";
import { useToast } from "../Toast";
import { copyToClipboard, fmtBytes, fmtStampFull, timeAgo } from "../../lib/format";
import "../../styles/EmailDetail.css";

// নাম থেকে সবসময় একই রঙ (প্রতিটা sender এর আলাদা চেনা যায়)
const hueOf = str => {
    let h = 0;
    for (const ch of String(str || "?")) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
};
const initialsOf = name =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase())
        .join("") || "?";

// ছোট copy আইকন বাটন
function CopyIcon({ text, label = "Copied" }) {
    const toast = useToast();
    const [done, setDone] = useState(false);
    async function copy(e) {
        e.stopPropagation();
        const ok = await copyToClipboard(String(text ?? ""));
        if (!ok) return toast.error("Couldn't copy. Select the text and copy it manually.");
        setDone(true);
        toast.success(label);
        setTimeout(() => setDone(false), 1500);
    }
    return (
        <button type="button" className="ed-copy" onClick={copy} aria-label="Copy">
            <Icon name={done ? "check" : "copy"} size={14} />
        </button>
    );
}

function Tile({ icon, label, wide, copy, children }) {
    return (
        <div className={`ed-tile ${wide ? "wide" : ""}`}>
            <div className="ed-k">
                <Icon name={icon} size={13} /> {label}
            </div>
            <div className="ed-v">
                <span className="ed-v-text">{children}</span>
                {copy && <CopyIcon text={copy} />}
            </div>
        </div>
    );
}

/**
 * একটা email এর পুরো বিবরণ — user এর dashboard আর admin এর "Sent emails" দুই জায়গায় একই ডিজাইন।
 * m = { id, subject, status, createdAt, senderName, senderEmail, receiverEmail,
 *       message, ipAddress, apiKeyName, owner? }
 */
export default function EmailDetailDrawer({ m, onClose }) {
    const toast = useToast();
    const ok = m?.status === "sent";

    const summary = m
        ? [
              `Subject: ${m.subject || "(no subject)"}`,
              `Status: ${ok ? "Sent" : "Failed"}`,
              `Received: ${fmtStampFull(m.createdAt)}`,
              `From: ${m.senderName} <${m.senderEmail}>`,
              `Delivered to: ${m.receiverEmail}`,
              m.owner ? `Account: ${m.owner.fullName} (@${m.owner.username}) <${m.owner.email}>` : null,
              `API key: ${m.apiKeyName}`,
              `Sender IP: ${m.ipAddress || "unknown"}`,
              "",
              m.message
          ]
              .filter(v => v !== null)
              .join("\n")
        : "";

    async function copyAll() {
        const done = await copyToClipboard(summary);
        if (done) toast.success("Full email details copied");
        else toast.error("Couldn't copy. Select the text and copy it manually.");
    }

    const replyHref = m
        ? `mailto:${encodeURIComponent(m.senderEmail)}?subject=${encodeURIComponent(
              `Re: ${m.subject || "Your message"}`
          )}`
        : "#";

    const words = m ? (m.message.trim().match(/\S+/g) || []).length : 0;
    const bytes = m ? new Blob([m.message]).size : 0;
    const hue = hueOf(m?.senderName || m?.senderEmail);

    return (
        <Drawer
            open={!!m}
            onClose={onClose}
            title="Email details"
            subtitle={m ? timeAgo(m.createdAt) : ""}
            footer={
                m && (
                    <>
                        <button type="button" className="btn btn-secondary" onClick={copyAll}>
                            <Icon name="copy" size={15} /> Copy all
                        </button>
                        <a className="btn btn-primary" href={replyHref}>
                            <Icon name="reply" size={15} /> Reply
                        </a>
                    </>
                )
            }
        >
            {m && (
                <div className="ed">
                    {/* ---- শিরোনাম + অবস্থা ---- */}
                    <section className={`ed-hero ${ok ? "" : "failed"}`}>
                        <span className={`ed-status ${ok ? "" : "failed"}`}>
                            <Icon name={ok ? "checkCircle" : "xCircle"} size={14} />
                            {ok ? "Delivered" : "Delivery failed"}
                        </span>
                        <h2 className="ed-subject">{m.subject || "(no subject)"}</h2>
                        <div className="ed-when">
                            <span>
                                <Icon name="clock" size={13} /> {fmtStampFull(m.createdAt)}
                            </span>
                        </div>
                    </section>

                    {/* ---- কে পাঠিয়েছে ---- */}
                    <section className="ed-person">
                        <span
                            className="ed-avatar"
                            style={{ background: `hsl(${hue} 55% 40%)` }}
                            aria-hidden="true"
                        >
                            {initialsOf(m.senderName)}
                        </span>
                        <div className="ed-meta">
                            <small>From</small>
                            <b className="truncate">{m.senderName}</b>
                            <a className="ed-mail truncate" href={`mailto:${m.senderEmail}`}>
                                {m.senderEmail}
                            </a>
                        </div>
                        <CopyIcon text={m.senderEmail} label="Sender email copied" />
                    </section>

                    {/* ---- মেসেজ ---- */}
                    <section className="ed-card">
                        <header className="ed-card-head">
                            <span className="ed-card-title">
                                <Icon name="fileText" size={14} /> Message
                            </span>
                            <CopyIcon text={m.message} label="Message copied" />
                        </header>
                        <div className="ed-msg">{m.message}</div>
                        <footer className="ed-msg-foot">
                            <span>{words.toLocaleString("en-US")} words</span>
                            <span>{m.message.length.toLocaleString("en-US")} characters</span>
                            <span>{fmtBytes(bytes)}</span>
                        </footer>
                    </section>

                    {/* ---- পথ: sender → API key → inbox ---- */}
                    <section>
                        <h4 className="ed-h">How it arrived</h4>
                        <ol className="ed-flow">
                            <li>
                                <span className="ed-dot">
                                    <Icon name="user" size={15} />
                                </span>
                                <div>
                                    <small>Sent by</small>
                                    <b>{m.senderName}</b>
                                    <span className="ed-sub">{m.senderEmail}</span>
                                </div>
                            </li>
                            <li>
                                <span className="ed-dot">
                                    <Icon name="key" size={15} />
                                </span>
                                <div>
                                    <small>Through API key</small>
                                    <b>{m.apiKeyName}</b>
                                    {m.owner && (
                                        <span className="ed-sub">
                                            Owned by {m.owner.fullName} · @{m.owner.username}
                                        </span>
                                    )}
                                </div>
                            </li>
                            <li>
                                <span className={`ed-dot ${ok ? "" : "bad"}`}>
                                    <Icon name={ok ? "inbox" : "alert"} size={15} />
                                </span>
                                <div>
                                    <small>{ok ? "Delivered to" : "Could not be delivered to"}</small>
                                    <b>{m.receiverEmail}</b>
                                </div>
                            </li>
                        </ol>
                    </section>

                    {/* ---- অ্যাকাউন্টের মালিক (শুধু admin এর view এ) ---- */}
                    {m.owner !== undefined && (
                        <section className="ed-owner">
                            {m.owner ? (
                                <>
                                    <Avatar src={m.owner.avatar} name={m.owner.fullName} size={40} />
                                    <div className="ed-meta">
                                        <small>Account</small>
                                        <b className="truncate">{m.owner.fullName}</b>
                                        <span className="ed-sub truncate">
                                            @{m.owner.username} · {m.owner.email}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="ed-meta">
                                    <small>Account</small>
                                    <b>Deleted user</b>
                                </div>
                            )}
                        </section>
                    )}

                    {/* ---- টেকনিক্যাল তথ্য ---- */}
                    <section>
                        <h4 className="ed-h">Technical details</h4>
                        <div className="ed-grid">
                            <Tile icon="globe" label="Sender IP" copy={m.ipAddress || ""}>
                                <span className="mono">{m.ipAddress || "Unknown"}</span>
                            </Tile>
                            <Tile icon="activity" label="Status">
                                {ok ? "Sent" : "Failed"}
                            </Tile>
                            <Tile icon="clock" label="Received" wide>
                                {fmtStampFull(m.createdAt)}
                            </Tile>
                            {m.id && (
                                <Tile icon="hash" label="Email ID" wide copy={m.id}>
                                    <span className="mono">{m.id}</span>
                                </Tile>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </Drawer>
    );
}
