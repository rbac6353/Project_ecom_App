/**
 * apiClient - Utility functions สำหรับ API calls พร้อม retry logic
 * 
 * Features:
 * - Retry logic สำหรับ HTTP 429 (Rate Limiting)
 * - Exponential backoff
 * - อ่าน Retry-After header จาก response
 * - Max retries = 3 ครั้ง
 */

import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryableStatuses?: number[];
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  baseDelay: 1000, // 1 วินาที
  maxDelay: 30000, // 30 วินาที
  retryableStatuses: [429, 500, 502, 503, 504], // HTTP status codes ที่ควร retry
};

/**
 * คำนวณ delay สำหรับ exponential backoff
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * อ่าน Retry-After header จาก response (ถ้ามี)
 * คืนค่าเป็น milliseconds
 */
function getRetryAfterDelay(response: AxiosResponse | undefined): number | null {
  if (!response) return null;

  const retryAfter = response.headers['retry-after'];
  if (!retryAfter) return null;

  // Retry-After อาจเป็น seconds (number) หรือ date string
  const retryAfterNum = parseInt(retryAfter, 10);
  if (!isNaN(retryAfterNum)) {
    // ถ้าเป็น seconds ให้แปลงเป็น milliseconds
    return retryAfterNum * 1000;
  }

  // ถ้าเป็น date string ให้คำนวณ delay
  const retryAfterDate = new Date(retryAfter);
  if (!isNaN(retryAfterDate.getTime())) {
    const delay = retryAfterDate.getTime() - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

/**
 * Sleep function สำหรับ delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch ข้อมูลพร้อม retry logic
 * 
 * ⚠️ หมายเหตุ: Response Interceptor แกะ response แล้ว ดังนั้น return type เป็น T ไม่ใช่ AxiosResponse<T>
 * 
 * @param client - Axios instance
 * @param url - API endpoint
 * @param config - Axios request config
 * @param retryConfig - Retry configuration
 * @returns Promise ที่ resolve กับ data (unwrapped by interceptor)
 */
export async function fetchWithRetry<T = any>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig,
  retryConfig?: RetryConfig
): Promise<T> {
  const finalConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig,
  };

  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // ✅ Response Interceptor แกะ response แล้ว return data โดยตรง
      const data = await client.get<T>(url, config);
      return data;
    } catch (error: any) {
      lastError = error;

      // ตรวจสอบว่าเป็น AxiosError หรือไม่
      if (!error.isAxiosError) {
        throw error;
      }

      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      // ตรวจสอบว่าเป็น error ที่ควร retry หรือไม่
      if (!status || !finalConfig.retryableStatuses.includes(status)) {
        throw error;
      }

      // ถ้าเป็น attempt สุดท้าย ให้ throw error
      if (attempt >= finalConfig.maxRetries) {
        throw error;
      }

      // คำนวณ delay
      let delay: number;

      // ถ้าเป็น 429 และมี Retry-After header ให้ใช้ค่านั้น
      if (status === 429) {
        const retryAfterDelay = getRetryAfterDelay(axiosError.response);
        if (retryAfterDelay !== null) {
          delay = retryAfterDelay;
        } else {
          // ใช้ exponential backoff
          delay = calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
        }
      } else {
        // ใช้ exponential backoff สำหรับ error อื่นๆ
        delay = calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
      }

      // Log retry attempt
      console.warn(
        `🔄 Retry attempt ${attempt + 1}/${finalConfig.maxRetries} for ${url} after ${delay}ms (Status: ${status})`
      );

      // รอก่อน retry
      await sleep(delay);
    }
  }

  // ไม่ควรมาถึงจุดนี้ แต่ถ้ามาให้ throw last error
  throw lastError || new Error('Unknown error occurred');
}

/**
 * Helper function สำหรับ GET request พร้อม retry
 * 
 * ⚠️ หมายเหตุ: Response Interceptor แกะ response แล้ว ดังนั้น return data โดยตรง
 */
export async function getWithRetry<T = any>(
  client: AxiosInstance,
  url: string,
  config?: AxiosRequestConfig,
  retryConfig?: RetryConfig
): Promise<T> {
  // ✅ fetchWithRetry return data โดยตรงแล้ว (unwrapped by interceptor)
  return await fetchWithRetry<T>(client, url, config, retryConfig);
}

/**
 * Helper function สำหรับ POST request พร้อม retry
 * 
 * ⚠️ หมายเหตุ: Response Interceptor แกะ response แล้ว ดังนั้น return data โดยตรง
 */
export async function postWithRetry<T = any>(
  client: AxiosInstance,
  url: string,
  data?: any,
  config?: AxiosRequestConfig,
  retryConfig?: RetryConfig
): Promise<T> {
  const finalConfig: Required<RetryConfig> = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig,
  };

  let lastError: AxiosError | null = null;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      // ✅ Response Interceptor แกะ response แล้ว return data โดยตรง
      const result = await client.post<T>(url, data, config);
      return result;
    } catch (error: any) {
      lastError = error;

      if (!error.isAxiosError) {
        throw error;
      }

      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (!status || !finalConfig.retryableStatuses.includes(status)) {
        throw error;
      }

      if (attempt >= finalConfig.maxRetries) {
        throw error;
      }

      let delay: number;
      if (status === 429) {
        const retryAfterDelay = getRetryAfterDelay(axiosError.response);
        delay = retryAfterDelay !== null ? retryAfterDelay : calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
      } else {
        delay = calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
      }

      console.warn(`🔄 Retry POST attempt ${attempt + 1}/${finalConfig.maxRetries} for ${url} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Unknown error occurred');
}

export default {
  fetchWithRetry,
  getWithRetry,
  postWithRetry,
};

