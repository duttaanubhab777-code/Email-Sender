import { DOCS_URL, getDocsStats } from "../services/api";
import useAsync from "../hooks/useAsync";
import CountUp from "./CountUp";
import Icon from "./Icons";
import "../styles/DocsStats.css";

const short = iso =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC"
    });

// GET /docs/stats — শুধু Admin + Super Admin। বইটা (/docs) সবাই দেখতে ও নামাতে পারে, কিন্তু সংখ্যা শুধু এখানে।
export default function DocsStatsCard() {
    const { data, loading, error, reload } = useAsync(
        signal => getDocsStats(signal),
        []
    );

    const days = data?.days ?? [];
    const peak = Math.max(1, ...days.map(d => d.count));

    return (
        <section className="card docs-card">
            <header className="docs-card-head">
                <div>
                    <h3>
                        <Icon name="fileText" size={17} /> Documentation book
                    </h3>
                    <p>
                        Public page with a PDF download. Only admins can see
                        these numbers.
                    </p>
                </div>
                <div className="docs-card-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={reload}
                        disabled={loading}
                    >
                        <Icon name="refresh" size={15} /> Refresh
                    </button>
                    <a
                        className="btn btn-primary"
                        href={DOCS_URL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Icon name="external" size={15} /> Open docs
                    </a>
                </div>
            </header>

            {error && !data ? (
                <p className="docs-card-err">{error}</p>
            ) : (
                <>
                    <div className="docs-card-stats">
                        <div className="big">
                            <span className="lab">
                                <Icon name="download" size={15} /> PDF downloads
                            </span>
                            <span className="val">
                                <CountUp value={data?.total ?? 0} />
                            </span>
                            <span className="sub">
                                {data?.lastDownloadAt
                                    ? `Last: ${new Date(data.lastDownloadAt).toLocaleString()}`
                                    : "No downloads yet"}
                            </span>
                        </div>
                        <div className="mini">
                            <b>{data?.today ?? 0}</b>
                            <span>Today</span>
                        </div>
                        <div className="mini">
                            <b>{data?.last7 ?? 0}</b>
                            <span>7 days</span>
                        </div>
                        <div className="mini">
                            <b>{data?.last30 ?? 0}</b>
                            <span>30 days</span>
                        </div>
                    </div>

                    <div className="docs-bars" aria-label="Downloads per day, last 30 days">
                        {days.map(d => (
                            <span
                                key={d.date}
                                className="bar"
                                title={`${short(d.date)} — ${d.count}`}
                                style={{
                                    height: `${Math.max(d.count ? 12 : 4, (d.count / peak) * 100)}%`
                                }}
                                data-zero={d.count ? undefined : "1"}
                            />
                        ))}
                    </div>
                    <div className="docs-bars-axis">
                        <span>{days[0] ? short(days[0].date) : ""}</span>
                        <span>Last 30 days (UTC)</span>
                        <span>{days.length ? short(days[days.length - 1].date) : ""}</span>
                    </div>
                </>
            )}
        </section>
    );
}
