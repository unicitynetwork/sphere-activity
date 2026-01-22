export type ActivityKind = 'marketplace_post' | 'token_transfer' | 'wallet_created' | 'game_started' | 'bet_placed' | 'otc_purchase' | 'merch_order' | 'pokemon_purchase';

export interface ActivityData {
  marketplace_post: {
    title: string;
    price: number;
    currency: string;
  };
  token_transfer: {
    amount?: string;
    symbol?: string;
  };
  wallet_created: Record<string, never>;
}

export interface CreateActivityRequest {
  kind: ActivityKind;
  unicityId?: string;
  data?: Record<string, unknown>;
  isPublic?: boolean;
}

export interface ActivityResponse {
  id: number;
  kind: ActivityKind;
  unicityId: string | null;
  data: Record<string, unknown> | null;
  isPublic: boolean | null;
  createdAt: string; // ISO string for JSON transport
}

export interface GetActivitiesResponse {
  activities: ActivityResponse[];
  nextCursor: string | null;
}
