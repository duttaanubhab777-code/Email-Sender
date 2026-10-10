import { useCallback, useEffect, useState } from "react";

// fetcher(signal) -> data. unmount হলে request বাতিল হয়
export default function useAsync(fetcher, deps = []) {
    const [state, setState] = useState({
        data: null,
        loading: true,
        error: ""
    });
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const ctrl = new AbortController();
        let alive = true;
        setState(s => ({ ...s, loading: true, error: "" }));
        fetcher(ctrl.signal)
            .then(
                data => alive && setState({ data, loading: false, error: "" })
            )
            .catch(err => {
                if (err.name === "AbortError" || !alive) return;
                setState(s => ({ ...s, loading: false, error: err.message }));
            });
        return () => {
            alive = false;
            ctrl.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick]);

    const reload = useCallback(() => setTick(t => t + 1), []);
    const setData = useCallback(
        updater =>
            setState(s => ({
                ...s,
                data: typeof updater === "function" ? updater(s.data) : updater
            })),
        []
    );
    return { ...state, reload, setData };
}
