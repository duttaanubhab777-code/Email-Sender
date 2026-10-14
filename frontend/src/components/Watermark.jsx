import badge from "../assets/logo-mark.png";

// প্রতিটা পেজে নিচের কোণে ভাসমান ওয়াটারমার্ক (ক্লিক আটকায় না, pointer-events: none)
export default function Watermark() {
    return (
        <div className="wm" aria-hidden="true">
            <img src={badge} alt="" draggable="false" />
            <span>
                Created by <b>Anubhab Dutta</b>
            </span>
        </div>
    );
}
