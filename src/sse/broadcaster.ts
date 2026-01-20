import type { ActivityResponse } from '../types/activity.js';

type SSEController = ReadableStreamDefaultController<string>;

class ActivityBroadcaster {
  private clients: Set<SSEController> = new Set();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);
  }

  private sendHeartbeat() {
    const heartbeat = ': heartbeat\n\n';
    for (const controller of this.clients) {
      try {
        controller.enqueue(heartbeat);
      } catch {
        this.clients.delete(controller);
      }
    }
  }

  addClient(controller: SSEController) {
    this.clients.add(controller);
    console.log(`SSE client connected. Total clients: ${this.clients.size}`);
  }

  removeClient(controller: SSEController) {
    this.clients.delete(controller);
    console.log(`SSE client disconnected. Total clients: ${this.clients.size}`);
  }

  broadcast(activity: ActivityResponse) {
    const data = `data: ${JSON.stringify(activity)}\n\n`;
    for (const controller of this.clients) {
      try {
        controller.enqueue(data);
      } catch {
        this.clients.delete(controller);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const broadcaster = new ActivityBroadcaster();
