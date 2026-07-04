import { kv } from '@vercel/kv';

// Check if environment variables are valid and not the placeholder
const hasRealKV = 
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_URL !== 'http://localhost:8079' &&
  process.env.KV_REST_API_TOKEN &&
  process.env.KV_REST_API_TOKEN !== 'placeholder_token';

class InMemoryKV {
  constructor() {
    this.store = new Map();    // KV initialized
  }

  async get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, options = {}) {
    let expiry = null;
    if (options.ex) {
      expiry = Date.now() + options.ex * 1000;
    }
    this.store.set(key, { value, expiry });
    return 'OK';
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }
}

// Store on global to persist across hot reloads in Next.js development mode
if (!global._inMemoryKV) {
  global._inMemoryKV = new InMemoryKV();
}

export const db = hasRealKV ? kv : global._inMemoryKV;
export const isFallback = !hasRealKV;
