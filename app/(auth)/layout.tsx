import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#09090b" }}
    >
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,58,237,0.2) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 px-8 py-6">
        <Link href="/" className="font-display font-bold text-xl text-white tracking-tight">
          Credify
        </Link>
      </div>
      <div className="relative z-10 flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}
