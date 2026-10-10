import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { listApprovals } from "../services/api";
import { findUsable, killTargetString } from "../lib/approvals";
import RequestApprovalModal from "../components/ui/RequestApprovalModal";

// "Extra" কাজ (admin তৈরি/নামানো, অন্য admin block/delete, kill switch):
//  Super Admin -> সরাসরি call(). Admin -> approved approval থাকলে তার id দিয়ে call(), না থাকলে permission চাওয়ার ফর্ম।
export default function useExtra() {
    const { user } = useAuth();
    const toast = useToast();
    const [req, setReq] = useState(null);

    const run = useCallback(
        async ({ action, target, targets, targetLabel, call }) => {
            if (user?.isSuperAdmin) return call(undefined);
            const key = targets ? killTargetString(targets) : String(target);
            let list = [];
            try {
                list = await listApprovals("approved");
            } catch (err) {
                toast.error(err.message);
                return undefined;
            }
            const found = findUsable(list, action, key);
            if (!found) {
                setReq({ action, target: key, targets, targetLabel });
                return undefined;
            }
            return call(found._id);
        },
        [user, toast]
    );

    const modal = (
        <RequestApprovalModal
            open={!!req}
            payload={req}
            onClose={() => setReq(null)}
        />
    );
    return { run, modal };
}
