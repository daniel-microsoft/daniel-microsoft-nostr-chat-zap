export async function fetchZapEndpoint(pubkey: string): Promise<string> {
  // For demo, hardcode or look up Lightning Address from user profile
  return "lnurlp:you@yourdomain.com"; // Replace with lookup logic!
}

export async function sendZap(
  zapEndpoint: string,
  senderPubkey: string,
  receiverPubkey: string,
  amount: number
) {
  // Use WebLN or fetch to send a LN payment via LNURLp or Lightning Address
  alert(`Zap of ${amount} sats sent to ${zapEndpoint} (stub)`);
  // Real implementation: Use LNURL, WebLN, or alby extension
}