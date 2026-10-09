// পুরো অ্যাপের অ্যানিমেটেড ব্যাকগ্রাউন্ড: ভাসমান গ্লো + গ্রিড + স্ক্যান লাইন
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
      <span className="grid-lines" />
      <span className="scan" />
    </div>
  );
}
