import React from "react";
import { createRoot } from "react-dom/client";

function parseTxFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const tx = params.get("tx");
  if (!tx) return null;
  try {
    return JSON.parse(decodeURIComponent(tx));
  } catch {
    return null;
  }
}

const fieldLabel: Record<string, string> = {
  from: "From",
  to: "To",
  value: "Value",
  gas: "Gas",
  gasPrice: "Gas Price",
  data: "Data",
  nonce: "Nonce",
  chainId: "Chain ID",
};

const TxInfo: React.FC<{ tx: any }> = ({ tx }) => (
  <div style={{ padding: 24, fontFamily: "monospace", background: "#fff", minHeight: "100vh", maxWidth: 420 }}>
    <h2 style={{ color: "#10B981", fontWeight: 700, marginBottom: 24 }}>트랜잭션 정보</h2>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <tbody>
        {Object.keys(fieldLabel).map((key) => (
          <tr key={key}>
            <td style={{ color: "#374151", fontWeight: 600, padding: "6px 8px", width: 100 }}>{fieldLabel[key]}</td>
            <td style={{ color: "#111", padding: "6px 8px", wordBreak: "break-all" }}>{tx[key] ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ marginTop: 24, color: "#6B7280", fontSize: 12 }}>
      전체 Raw 데이터
      <pre
        style={{ background: "#F3F4F6", padding: 12, borderRadius: 8, fontSize: 12, marginTop: 8, overflowX: "auto" }}
      >
        {JSON.stringify(tx, null, 2)}
      </pre>
    </div>
  </div>
);

const tx = parseTxFromQuery();

const App = () => <div>{tx ? <TxInfo tx={tx} /> : <div style={{ padding: 24 }}>트랜잭션 정보가 없습니다.</div>}</div>;

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}