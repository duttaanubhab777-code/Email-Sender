import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/api";
import "../../styles/Register.css"; // CSS ফাইলটি ইমপোর্ট করা হলো

export default function Register() {
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState(null);

    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append("fullName", fullName);
            formData.append("username", username.toLowerCase());
            formData.append("email", email.toLowerCase());
            formData.append("password", password);

            if (avatar) {
                formData.append("avatar", avatar);
            }

            await registerUser(formData);

            alert("Registration Successful! Please login.");
            navigate("/login", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="login-container">
            <div className="glass-card register-card">
                <h2 className="register-title">Create an Account</h2>

                {error && <p className="error-message">{error}</p>}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="input-group">
                        <label className="input-label">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => {
                                const formattedValue = e.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]/g, "");
                                setUsername(formattedValue);
                            }}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => {
                                const formattedValue =
                                    e.target.value.toLowerCase();
                                setEmail(formattedValue);
                            }}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">
                            Profile Picture (Optional)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => setAvatar(e.target.files[0])}
                            className="file-input"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="submit-btn"
                    >
                        {submitting ? "Registering..." : "Register"}
                    </button>
                </form>

                <p className="login-redirect-text">
                    Already have an account?{" "}
                    <Link to="/login" className="login-link">
                        Login here
                    </Link>
                </p>
            </div>
        </div>
    );
}
