import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ShareTargetPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Processing shared content...");

  useEffect(() => {
    const title = searchParams.get("title") || "";
    const text = searchParams.get("text") || "";
    const url = searchParams.get("url") || "";

    const sharedContent = [text, url, title].filter(Boolean).join(" ");
    if (!sharedContent) {
      setStatus("No shared content received.");
      return;
    }

    const token = localStorage.getItem("token");
    fetch("/api/v1/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        text_content: url ? undefined : sharedContent,
        url: url || (sharedContent.startsWith("http") ? sharedContent : undefined),
        modality: url || sharedContent.startsWith("http") ? "url" : "text",
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          navigate(`/dashboard/history?highlight=${data.id}`);
        } else {
          setStatus("Failed to submit shared content for verification.");
        }
      })
      .catch((err) => {
        setStatus(`Error processing share: ${err.message}`);
      });
  }, [searchParams, navigate]);

  return (
    <div className="max-w-2xl mx-auto py-12 text-center">
      <div className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-xl p-8 shadow-xl">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Credo Web Share Target</h2>
        <p className="text-slate-400">{status}</p>
      </div>
    </div>
  );
}
