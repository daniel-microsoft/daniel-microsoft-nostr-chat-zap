import React, { useState, useEffect } from "react";
import { Relay, finalizeEvent, getPublicKey, SimplePool } from "nostr-tools";
import { fetchZapEndpoint, sendZap } from "./zap";
import { nip19, nip04 } from "nostr-tools";
import { NostrEvent } from "./types";

export default function App() {
  const [privkey, setPrivkey] = useState<Uint8Array | null>(null);
  const [nsec, setNsec] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [relay, setRelay] = useState<Relay | null>(null);
  const [pool, setPool] = useState<SimplePool | null>(null);
  const [dm, setDm] = useState("");
  const [peer, setPeer] = useState(""); // peer pubkey
  const [chats, setChats] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);

  // Setup DM subscription when relay and pubkey are available
  useEffect(() => {
    if (relay && pubkey && privkey) {
      // Subscribe to DMs sent to us
      const sub = relay.subscribe([
        {
          kinds: [4],
          "#p": [pubkey]
        }
      ], {
        onevent: async (event: NostrEvent) => {
          try {
            // Decrypt the DM
            const decrypted = await nip04.decrypt(privkey, event.pubkey, event.content);
            setChats(c => [...c, `${event.pubkey.slice(0, 16)}...: ${decrypted}`]);
          } catch (e) {
            console.error('Failed to decrypt DM:', e);
          }
        }
      });

      return () => {
        sub.close();
      };
    }
  }, [relay, pubkey, privkey]);

  // Authenticate
  async function loginWithNsec() {
    try {
      const { type, data } = nip19.decode(nsec);
      if (type !== "nsec") throw new Error("Invalid nsec");
      const priv = data as Uint8Array; // Uint8Array
      const pub = getPublicKey(priv);
      setPubkey(pub);
      setPrivkey(priv); // Store Uint8Array privkey for signing/encrypting
      
      const r = await Relay.connect("wss://relay.damus.io");
      setRelay(r);
      
      const p = new SimplePool();
      setPool(p);
      
      setConnected(true);
      
      // Clear nsec for security
      setNsec("");
    } catch (e) {
      alert("Invalid nsec: " + (e as Error).message);
    }
  }

  // Send DM
  async function sendDM() {
    if (!relay || !privkey || !peer || !dm.trim()) return;

    try {
      // Encrypt the message
      const encrypted = await nip04.encrypt(privkey, peer, dm);
      
      const event: NostrEvent = {
        kind: 4,
        pubkey,
        created_at: Math.floor(Date.now() / 1000),
        content: encrypted,
        tags: [["p", peer]],
      };
      
      const signedEvent = finalizeEvent(event, privkey);
      relay.publish(signedEvent);
      setChats((c) => [...c, `Me: ${dm}`]);
      setDm("");
    } catch (e) {
      alert("Failed to send DM: " + (e as Error).message);
    }
  }

  // Send Zap
  async function zap() {
    if (!pool || !privkey || !peer) return;
    
    try {
      await sendZap(pool, privkey, pubkey, peer, 1000);
      setChats((c) => [...c, "⚡ Zap sent!"]);
    } catch (e) {
      alert("Failed to send zap: " + (e as Error).message);
    }
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      {!pubkey ? (
        <div>
          <h2>🔑 Login with nsec</h2>
          <p>Enter your Nostr private key (nsec1...) to login:</p>
          <input
            type="password"
            value={nsec}
            onChange={e => setNsec(e.target.value)}
            placeholder="nsec1..."
            style={{ width: "400px", padding: "8px", marginRight: "10px" }}
          />
          <button onClick={loginWithNsec} style={{ padding: "8px 16px" }}>
            Login
          </button>
          <p style={{ color: "#666", fontSize: "12px", marginTop: "10px" }}>
            ⚠️ For demo only! Don't use real mainnet keys.
          </p>
        </div>
      ) : (
        <div>
          <h3>
            ✅ Connected as {pubkey.slice(0, 16)}...
            {connected && <span style={{ color: "green" }}> (relay connected)</span>}
          </h3>
          
          <div style={{ marginBottom: "20px" }}>
            <label>
              <strong>Chat with pubkey:</strong>
              <br />
              <input
                value={peer}
                onChange={e => setPeer(e.target.value)}
                placeholder="Enter peer's public key (hex)"
                style={{ width: "400px", padding: "8px", marginTop: "5px" }}
              />
            </label>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <input
              value={dm}
              onChange={e => setDm(e.target.value)}
              placeholder="Type your message..."
              style={{ width: "300px", padding: "8px", marginRight: "10px" }}
              onKeyPress={e => e.key === 'Enter' && sendDM()}
            />
            <button 
              onClick={sendDM} 
              disabled={!peer || !dm.trim()}
              style={{ padding: "8px 16px", marginRight: "10px" }}
            >
              Send DM
            </button>
            <button 
              onClick={zap}
              disabled={!peer}
              style={{ padding: "8px 16px" }}
            >
              Zap ⚡ (1000 sats)
            </button>
          </div>

          <div>
            <h4>💬 Chat Messages</h4>
            <div style={{ 
              border: "1px solid #ccc", 
              height: "300px", 
              overflow: "auto", 
              padding: "10px",
              backgroundColor: "#f9f9f9"
            }}>
              {chats.length === 0 ? (
                <p style={{ color: "#666" }}>No messages yet. Start chatting!</p>
              ) : (
                chats.map((m, i) => (
                  <div key={i} style={{ marginBottom: "5px" }}>
                    {m}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
