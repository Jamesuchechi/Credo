// Ambient in-page claim highlighter for Credo Shield

console.log("[Credo] Ambient claim verification active.");

// Inject subtle underline style
const style = document.createElement("style");
style.textContent = `
  .credo-flagged-claim {
    border-bottom: 2px dashed #f59e0b;
    background-color: rgba(245, 158, 11, 0.1);
    cursor: help;
  }
`;
document.head.appendChild(style);
