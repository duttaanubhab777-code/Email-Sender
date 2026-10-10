import { useState } from "react";
import Icon from "../Icons";

export default function PasswordField({
    label = "Password",
    value,
    onChange,
    id,
    autoComplete = "current-password",
    placeholder = "••••••••",
    error,
    hint,
    right,
    autoFocus,
    required = true
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="field">
            <label className="label" htmlFor={id}>
                <span>{label}</span>
                {right}
            </label>
            <div className="input-wrap">
                <input
                    id={id}
                    className={`input ${error ? "is-error" : ""}`}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    required={required}
                />
                <button
                    type="button"
                    className="adorn"
                    onClick={() => setShow(s => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    tabIndex={-1}
                >
                    <Icon name={show ? "eyeOff" : "eye"} size={17} />
                </button>
            </div>
            {error ? (
                <span className="help err">{error}</span>
            ) : hint ? (
                <span className="help">{hint}</span>
            ) : null}
        </div>
    );
}
