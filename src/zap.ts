import { getEventHash, finalizeEvent, SimplePool } from "nostr-tools";
import { NostrEvent } from "./types";

export async function fetchZapEndpoint(pool: SimplePool, pubkey: string): Promise<string | null> {
  try {
    const events = await pool.querySync(["wss://relay.damus.io"], {
      authors: [pubkey],
      kinds: [0],
      limit: 1
    });
    
    if (events.length === 0) return null;
    const event = events[0];
    const meta = JSON.parse(event.content);
    return meta.lud16 || meta.lud06 || null;
  } catch (e) {
    console.error('Failed to fetch zap endpoint:', e);
    return null;
  }
}

export async function sendZap(
  pool: SimplePool,
  senderPrivkey: Uint8Array,
  senderPubkey: string,
  receiverPubkey: string,
  amount: number // in sats
) {
  const endpoint = await fetchZapEndpoint(pool, receiverPubkey);
  if (!endpoint) {
    throw new Error("No zap endpoint found for peer");
  }

  // Handle lud16 -> LNURL
  let lnurl = endpoint;
  if (endpoint.includes("@")) { // lud16: user@domain
    const [user, domain] = endpoint.split("@");
    lnurl = `https://${domain}/.well-known/lnurlp/${user}`;
  } // else assume lud06 is LNURL already

  // Create zap request event (kind 9734)
  const zapRequest: NostrEvent = {
    kind: 9734,
    pubkey: senderPubkey,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["p", receiverPubkey],
      ["amount", (amount * 1000).toString()], // millisats
      ["relays", "wss://relay.damus.io"], // Your relays
    ],
    content: "Zap from Nostr chat demo!", // Optional comment
  };

  // Sign the zap request
  const signedZapRequest = finalizeEvent(zapRequest, senderPrivkey);
  
  // Encode the signed zap request as hex
  const zapRequestJson = JSON.stringify(signedZapRequest);
  const hexZapRequest = Buffer.from(zapRequestJson, 'utf8').toString('hex');

  try {
    // Fetch invoice from LNURL endpoint
    const lnurlRes = await fetch(`${lnurl}?amount=${amount * 1000}&nostr=${hexZapRequest}`);
    
    if (!lnurlRes.ok) {
      throw new Error(`LNURL request failed: ${lnurlRes.status}`);
    }
    
    const lnurlData = await lnurlRes.json();
    
    if (lnurlData.status === 'ERROR') {
      throw new Error(`LNURL error: ${lnurlData.reason}`);
    }
    
    const invoice = lnurlData.pr;
    if (!invoice) {
      throw new Error('No invoice received from LNURL endpoint');
    }

    // Try to pay with WebLN if available
    if (window.webln) {
      try {
        await window.webln.enable();
        await window.webln.sendPayment(invoice);
        alert(`✅ Zap of ${amount} sats sent successfully via WebLN!`);
        return;
      } catch (weblnError) {
        console.warn('WebLN payment failed:', weblnError);
      }
    }

    // Fallback: show invoice for manual payment
    const shortInvoice = invoice.length > 100 ? 
      invoice.substring(0, 50) + '...' + invoice.substring(invoice.length - 50) : 
      invoice;
    
    alert(`⚡ Lightning Invoice (${amount} sats):\n\n${shortInvoice}\n\nPay manually with your Lightning wallet!`);
    
    // Copy to clipboard if possible
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(invoice);
        console.log('Invoice copied to clipboard');
      } catch (e) {
        console.warn('Failed to copy to clipboard:', e);
      }
    }
    
  } catch (error) {
    console.error('Zap failed:', error);
    throw error;
  }
}
