import React, { useState } from "react";
import { relayInit, signEvent, getPublicKey } from "nostr-tools";
import { generatePrivateKey, getPublicKey as getPub } from "nostr-tools";
import { encode as encodeBech32, decode as decodeBech32 } from "@scure/base";
import { fetchZapEndpoint, sendZap } from "./zap"; // Your Lightning/Zap util

export default function App() {
  const [nsec, setNsec] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [relay, setRelay] = useState<any>(null);
  const [dm, setDm] = useState("");
  const [peer, setPeer] = useState(""); // peer pubkey
  const [chats, setChats] = useState<string[]>([]);

  // Authenticate
  function loginWithNsec() {
    try {
      const { prefix, words } = decodeBech32(nsec);
      const priv = Buffer.from(encodeBech32("nsec", words));
      const pub = getPub(priv);
      setPubkey(pub);
      const r = relayInit("wss://relay.damus.io");
      r.connect();
      setRelay(r);
      // Subscribe to peer DMs
      r.on("connect", () => {
        r.subscribe("chat", {
          kinds: [4],
          "#p": [pub],
        });
        r.on("event", (ev: any) => {
          setChats((c) => [...c, ev.content]);
        });
      });
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
    const zapEndpoint = await fetchZapEndpoint(peer); // LNURL or Lightning Address
    await sendZap(zapEndpoint, pubkey, peer, 1000); // 1000 sats
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