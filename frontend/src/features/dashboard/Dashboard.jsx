import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboard, createApiKey, deleteApiKey } from "../../services/api";
import "../../styles/Dashboard.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    
    getDashboard(controller.signal)
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    
    setCreating(true);
    setActionError("");
    
    try {
      const newKey = await createApiKey(name.trim());
      setData((d) => ({
        ...d,
        totalApiKeys: d.totalApiKeys + 1,
        apiKeysList: [newKey, ...d.apiKeysList],
      }));
      setName("");
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function copyKey(key) {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      window.prompt("Copy korun:", key);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Ei API Key muche felben? Eta ar ferano jabe na.")) return;
    
    try {
      await deleteApiKey(id);
      setData((d) => ({
        ...d,
        totalApiKeys: d.totalApiKeys - 1,
        apiKeysList: d.apiKeysList.filter((k) => k._id !== id),
      }));
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <div className="spinner" style={{ color: "white", textAlign: "center", marginTop: "50px" }}>Opekkha korun...</div>;
  if (error) return <p className="error-text">{error}</p>;

  const { fullName, avatar, totalApiKeys, totalEmailsSent, apiKeysList } = data;

  return (
    <div className="dashboard-container">
      
      <header className="glass-card dashboard-header">
        <div className="user-profile">
          <img src={avatar || "/default-avatar.png"} alt="Profile" className="avatar" />
          <div className="user-details">
            <h3>Welcome, {fullName}</h3>
            <p>@{user?.username}</p>
          </div>
        </div>
        <button onClick={logout} className="btn-logout">Logout</button>
      </header>

      <section className="stats-grid">
        <div className="glass-card stat-card">
          <h4>Total API Keys</h4>
          <h2>{totalApiKeys}</h2>
        </div>
        <div className="glass-card stat-card">
          <h4>Total Emails Sent</h4>
          <h2 className="success-text">{totalEmailsSent}</h2>
        </div>
      </section>

      {actionError && <p className="error-text">{actionError}</p>}

      <section className="glass-card create-section">
        <h3>Create New API Key</h3>
        <form onSubmit={handleCreate} className="create-form">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter website or project name"
            required
            className="input-field"
          />
          <button type="submit" disabled={creating} className="btn-primary">
            {creating ? "Creating..." : "+ Generate Key"}
          </button>
        </form>
      </section>

      <section className="keys-section">
        <h3>My API Keys</h3>
        {apiKeysList?.length === 0 ? (
          <div className="glass-card empty-state">
            <p>Kono API Key toiri kora hoyni. Uporer button theke notun Key generate korun.</p>
          </div>
        ) : (
          <div className="table-responsive glass-card">
            <table className="keys-table">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>API Key</th>
                  <th>Emails Sent (Usage)</th>
                  <th>Created Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {apiKeysList.map((k) => {
                  const percent = Math.min(100, Math.round((k.usageCount / k.monthlyLimit) * 100));
                  
                  return (
                    <tr key={k._id}>
                      <td data-label="Project Name" style={{ fontWeight: 'bold' }}>{k.name}</td>
                      
                      <td data-label="API Key">
                        <code className="api-key-display inline-code">{k.key}</code>
                      </td>
                      
                      <td data-label="Emails Sent">
                        <div className="usage-cell">
                          <span className="usage-count">{k.usageCount} / {k.monthlyLimit}</span>
                          <div className="progress-bar mini">
                            <div className="progress-fill" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      </td>
                      
                      <td data-label="Created Date">{new Date(k.createdAt).toLocaleDateString("bn-BD")}</td>
                      
                      <td data-label="Action" className="action-cell">
                        <button onClick={() => copyKey(k.key)} className="btn-copy mini-btn">
                          {copiedId === k.key ? "✅" : "📋 Copy"}
                        </button>
                        
                        <button className="btn-inbox mini-btn">
                          📥 Emails
                        </button>
                        
                        <button onClick={() => handleDelete(k._id)} className="btn-delete mini-btn">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}