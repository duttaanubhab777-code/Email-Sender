import Splash from "./ui/Splash";

// ফুল-স্ক্রিন লোডার — এখন নতুন অ্যানিমেটেড Splash ব্যবহার করে
export default function Spinner({ text }) {
    return <Splash text={text} />;
}
