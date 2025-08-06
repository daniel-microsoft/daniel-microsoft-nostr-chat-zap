import { getEventHash } from "nostr-tools";

export async function fetchZapEndpoint(relay: any, pubkey: string): Promise<string | null> {
  const event = await relay.get({
    authors: [pubkey],
    kinds: [0],
  });
  if (!event) return null;
  const meta = JSON.parse(event.content);
  return meta.lud06 || meta.lud16;
}

export async function sendZap(
  relay: any,
  senderPrivkey: string,
  senderPubkey: string,
  receiverPubkey: string,
  amount: number // in sats
) {
  const endpoint = await fetchZapEndpoint(relay, receiverPubkey);
  if (!endpoint) {
    alert("No zap endpoint found for peer");
    return;
  }

  // Handle lud16 -> LNURL
  let lnurl = endpoint;
  if (endpoint.includes("@")) { // lud16: user@domain
    const [user, domain] = endpoint.split("@");
    lnurl = `https://${domain}/.well-known/lnurlp/${user}`;
  } // else assume lud06 is LNURL

  // Create unsigned zap request (kind 9734)
  const zapRequest = {
    kind: 9734,
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["p", receiverPubkey],
      ["amount", (amount * 1000).toString()], // millisats
      ["relays", ["wss://relay.damus.io"]], // Your relays
    ],
    content: "Zap from demo app!", // Optional comment
  };
  zapRequest.id = getEventHash(zapRequest);

  // Hex-encode the JSON (without sig)
  const { sig, ...unsigned } = zapRequest; // Remove sig if present
  const hexJson = Buffer.from(JSON.stringify(unsigned)).toString("hex");

  // Fetch invoice from LNURL
  const res = await fetch(`${lnurl}?amount=${amount * 1000}&nostr=${hexJson}`);
  const { pr: invoice } = await res.json();

  // Pay (stub; in real: use WebLN or lightning wallet)
  // if (window.webln) { await window.webln.sendPayment(invoice); }
  alert(`Invoice: ${invoice} (pay ${amount} sats manually)`);
}
