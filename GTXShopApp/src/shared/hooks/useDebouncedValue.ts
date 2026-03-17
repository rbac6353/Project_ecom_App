/**
 * useDebouncedValue - Custom hook สำหรับ debounce value
 * 
 * ใช้สำหรับ delay การอัปเดต value จนกว่าจะผ่าน delay time ที่กำหนด
 * มีประโยชน์เมื่อต้องการลดจำนวน API calls หรือ re-renders
 * 
 * @param value - ค่าที่ต้องการ debounce
 * @param delay - ระยะเวลา delay ใน milliseconds (default: 500ms)
 * @returns debounced value
 */

import { useState, useEffect } from 'react';

function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // ตั้ง timer สำหรับอัปเดต debounced value
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: clear timer เมื่อ value หรือ delay เปลี่ยน หรือ component unmount
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;

