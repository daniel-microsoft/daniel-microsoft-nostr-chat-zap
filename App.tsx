import React, { useState } from "react";
import { relayInit, signEvent, getPublicKey } from "nostr-tools";
import { generatePrivateKey, getPublicKey as getPub } from "nostr-tools";
import { fetchZapEndpoint, sendZap } from "./zap"; // Your Lightning/Zap util
import { nip19, nip04 } from "nostr-tools";

export default function App() {
  const [privkey, setPrivkey] = useState("");
  const [nsec, setNsec] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [relay, setRelay] = useState<any>(null);
  const [dm, setDm] = useState("");
  const [peer, setPeer] = useState(""); // peer pubkey
  const [chats, setChats] = useState<string[]>([]);

  // Authenticate
 function loginWithNsec() {
  try {
    const { type, data } = nip19.decode(nsec);
    if (type !== "nsec") throw new Error("Invalid nsec");
    const priv = data; // hex string
    const pub = getPublicKey(priv);
    setPubkey(pub);
    setPrivkey(priv); // Store hex privkey for signing/encrypting
    // Optional: Clear nsec for slight security improvement
    setNsec("");
    const r = relayInit("wss://relay.damus.io");
    r.connect();
    setRelay(r);
    // ... (rest as below, with subscription fixes)
  } catch (e) {
    alert("Invalid nsec");
  }
}

  // Send DM
  async function sendDM() {
    const event = {
      kind: 4,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      content: dm,
      tags: [["p", peer]],
    };
    event.sig = signEvent(event, nsec);
    relay.publish(event);
    setChats((c) => [...c, `Me: ${dm}`]);
    setDm("");
  }

  // Send Zap
async function zap() {
  const zapEndpoint = await fetchZapEndpoint(relay, peer);
  await sendZap(relay, privkey, pubkey, peer, 1000);
  setChats((c) => [...c, "Zap sent!"]);
}

  return (
    <div>
      {!pubkey ? (
        <div>
          <h2>Login with nsec</h2>
          <input
            value={nsec}
            onChange={e => setNsec(e.target.value)}
            placeholder="nsec1..."
          />
          <button onClick={loginWithNsec}>Login</button>
        </div>
      ) : (
        <div>
          <h3>Logged as {pubkey.slice(0, 16)}...</h3>
          <input
            value={peer}
            onChange={e => setPeer(e.target.value)}
            placeholder="Peer pubkey"
          />
          <div>
            <input
              value={dm}
              onChange={e => setDm(e.target.value)}
              placeholder="Type message"
            />
            <button onClick={sendDM}>Send</button>
            <button onClick={zap}>Zap ⚡</button>
          </div>
          <div>
            <h4>Chat</h4>
            <ul>
              {chats.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
