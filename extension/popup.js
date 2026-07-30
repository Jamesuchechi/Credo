const API_BASE = "http://localhost:8000/api/v1";

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;

  document.getElementById("verdict").innerText = "Analyzing page credibility...";

  try {
    const response = await fetch(`${API_BASE}/content`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url, modality: "url" }),
    });

    const data = await response.json();
    const contentId = data.id;

    // Poll for result
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const checkRes = await fetch(`${API_BASE}/content/${contentId}`);
      if (checkRes.ok) {
        const item = await checkRes.json();
        if (item.analysis_result) {
          const score = item.analysis_result.composite_score;
          document.getElementById("score").innerText = `${score.toFixed(0)}/100`;
          document.getElementById("verdict").innerText = score >= 70 ? "High Credibility Source" : (score >= 40 ? "Proceed With Caution" : "High Risk Misinformation");
          chrome.runtime.sendMessage({ type: "UPDATE_BADGE", score });
          return;
        }
      }
    }
    document.getElementById("verdict").innerText = "Analysis timed out.";
  } catch (err) {
    document.getElementById("verdict").innerText = "Failed to connect to Credo server.";
  }
});
