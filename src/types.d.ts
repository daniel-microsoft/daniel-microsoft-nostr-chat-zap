declare global {
  interface Window {
    webln?: {
      enable(): Promise<void>;
      sendPayment(paymentRequest: string): Promise<any>;
    };
  }
}

export interface NostrEvent {
  id?: string;
  kind: number;
  pubkey: string;
  created_at: number;
  tags: string[][];
  content: string;
  sig?: string;
}

export interface RelaySubscription {
  sub: (filters: any[], opts?: { id?: string }) => void;
  unsub: (id: string) => void;
  close: () => void;
}

export interface Relay {
  connect(): Promise<void>;
  close(): void;
  publish(event: NostrEvent): void;
  get(filters: any): Promise<NostrEvent | null>;
  list(filters: any[]): Promise<NostrEvent[]>;
  sub(filters: any[], opts?: { id?: string }): RelaySubscription;
}

export {};