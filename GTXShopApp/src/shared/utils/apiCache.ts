/**
 * APICache - Cache API responses เพื่อลดจำนวน requests และป้องกัน duplicate requests
 * 
 * Features:
 * - Cache responses เป็นเวลา 5 วินาที (default)
 * - ป้องกัน duplicate requests ที่เกิดพร้อมกัน
 * - ใช้ Map สำหรับเก็บ cache และ pending requests
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PendingRequest<T = any> {
  promise: Promise<T>;
  abortController?: AbortController;
}

class APICache {
  private cache: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private defaultTTL: number = 5000; // 5 วินาที

  /**
   * สร้าง cache key จาก URL และ config
   */
  private getCacheKey(url: string, config?: AxiosRequestConfig): string {
    const method = config?.method?.toUpperCase() || 'GET';
    const params = config?.params ? JSON.stringify(config.params) : '';
    const data = config?.data ? JSON.stringify(config.data) : '';
    return `${method}:${url}:${params}:${data}`;
  }

  /**
   * ตรวจสอบว่า cache entry ยัง valid อยู่หรือไม่
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * ดึงข้อมูลจาก cache หรือ fetch ใหม่
   * 
   * @param client - Axios instance
   * @param url - API endpoint
   * @param config - Axios request config
   * @param ttl - Time to live ใน milliseconds (default: 5000ms)
   * @returns Promise ที่ resolve กับ response data
   */
  async get<T = any>(
    client: AxiosInstance,
    url: string,
    config?: AxiosRequestConfig,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cacheKey = this.getCacheKey(url, config);

    // ตรวจสอบ cache
    const cached = this.cache.get(cacheKey);
    if (cached && this.isValid(cached)) {
      return Promise.resolve(cached.data);
    }

    // ตรวจสอบว่ามี pending request อยู่หรือไม่
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      return pending.promise;
    }

    // สร้าง AbortController สำหรับ cancel request
    const abortController = new AbortController();

    // สร้าง request promise
    const requestPromise = client
      .get<T>(url, {
        ...config,
        signal: abortController.signal,
      })
      .then((response: AxiosResponse<T>) => {
        const data = response.data;

        // บันทึกใน cache
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + ttl,
        });

        // ลบ pending request
        this.pendingRequests.delete(cacheKey);

        return data;
      })
      .catch((error: any) => {
        // ลบ pending request เมื่อเกิด error
        this.pendingRequests.delete(cacheKey);

        // ถ้าเป็น AbortError ไม่ต้อง throw (request ถูก cancel แล้ว)
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          return Promise.reject(new Error('Request was cancelled'));
        }

        throw error;
      });

    // เก็บ pending request
    this.pendingRequests.set(cacheKey, {
      promise: requestPromise,
      abortController,
    });

    return requestPromise;
  }

  /**
   * Cancel pending request สำหรับ URL และ config ที่ระบุ
   */
  cancel(url: string, config?: AxiosRequestConfig): void {
    const cacheKey = this.getCacheKey(url, config);
    const pending = this.pendingRequests.get(cacheKey);

    if (pending?.abortController) {
      pending.abortController.abort();
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * ลบ cache entry สำหรับ URL และ config ที่ระบุ
   */
  clear(url?: string, config?: AxiosRequestConfig): void {
    if (url && config) {
      const cacheKey = this.getCacheKey(url, config);
      this.cache.delete(cacheKey);
    } else {
      // ลบทั้งหมด
      this.cache.clear();
      this.pendingRequests.clear();
    }
  }

  /**
   * ลบ cache entries ที่หมดอายุแล้ว (cleanup)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * ตั้งค่า default TTL
   */
  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * ดึงจำนวน cache entries
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * ดึงจำนวน pending requests
   */
  getPendingSize(): number {
    return this.pendingRequests.size;
  }
}

// Export singleton instance
export const apiCache = new APICache();

// Export class สำหรับใช้สร้าง instance ใหม่ (ถ้าต้องการ)
export default APICache;

