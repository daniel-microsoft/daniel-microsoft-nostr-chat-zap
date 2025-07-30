# Nostr Chat + Lightning Zaps ⚡

A minimal React demo for chatting via Nostr using nsec authentication, with Lightning (NIP-57) Zap support.

## Features

- Login with your nsec (private key, bech32 format)
- Chat using Nostr DMs (kind 4 events)
- Send Lightning Zaps to other pubkeys with NIP-57

## Setup

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Notes

- For demo purposes only! Do not use real mainnet keys.
- Zaps use NIP-57 and WebLN if available. For real Lightning, use LNURL, WebLN, or Alby.