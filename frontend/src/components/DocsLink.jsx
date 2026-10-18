import { DOCS_URL } from "../services/api";
import Icon from "./Icons";

// /docs বইটা সবার জন্য খোলা (লগইন লাগে না)। এটা সাধারণ <a> — React Router নয়,
// কারণ /docs সার্ভার নিজে বানায়। নতুন ট্যাবে খোলে, তাই অ্যাপের পেজ হারায় না।
const props = { href: DOCS_URL, target: "_blank", rel: "noopener noreferrer" };

// Login / Register এর উপরে: নিবন্ধন না করা ইউজারও দেখতে পায়
export function DocsPill() {
    return (
        <a {...props} className="docs-pill" title="Open the documentation book">
            <Icon name="fileText" size={15} />
            <span>Docs</span>
        </a>
    );
}

// Console এর টপবারে (মোবাইলেও দেখা যায়, কারণ sidebar লুকানো থাকে)
export function DocsIconLink() {
    return (
        <a
            {...props}
            className="btn-icon docs-icon-link"
            style={{ width: 38 }}
            aria-label="Open documentation"
            title="Documentation"
        >
            <Icon name="fileText" size={18} />
        </a>
    );
}

// Sidebar এর ছোট লিংক
export function DocsSideLink() {
    return (
        <a {...props} className="side-link">
            <Icon name="fileText" size={17} />
            <span>Documentation</span>
            <Icon name="external" size={13} />
        </a>
    );
}

// Account মেনুর ভেতরে
export function DocsMenuItem() {
    return (
        <a {...props} className="menu-item" role="menuitem">
            <Icon name="fileText" size={16} /> Documentation
        </a>
    );
}

// Login / Register এর নিচে লাইনে
export function DocsFootLink() {
    return (
        <p className="auth-foot docs-foot">
            <a {...props} className="link">
                <Icon name="fileText" size={14} /> Read the documentation
            </a>
        </p>
    );
}
