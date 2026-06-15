"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/workspace/invites/accept/${token}`, { method: "POST" })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(d.error ?? "Something went wrong");
          setStatus("error");
        }
      })
      .catch(() => { setErrorMsg("Network error"); setStatus("error"); });
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#09090b" }}>
      <div className="text-center">
        {status === "loading" && <p className="text-zinc-400">Accepting invite…</p>}
        {status === "success" && (
          <>
            <p className="text-green-400 font-semibold text-lg">You've joined the workspace!</p>
            <p className="text-zinc-500 text-sm mt-1">Redirecting to dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-red-400 font-semibold text-lg">Could not accept invite</p>
            <p className="text-zinc-500 text-sm mt-1">{errorMsg}</p>
          </>
        )}
      </div>
    </div>
  );
}
