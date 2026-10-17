import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <span className="eyebrow">404 / OUT OF BOUNDS</span>
      <h1>That play went nowhere.</h1>
      <p>This page or manager isn’t in the archive.</p>
      <Link className="button primary" href="/">
        Back to League HQ →
      </Link>
    </main>
  );
}
