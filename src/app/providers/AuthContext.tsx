// context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '@app/api/client';

// 1. สร้าง Context
interface AuthContextType {
  token: string | null;
  user: any | null; // TODO: สร้าง User Interface
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  loginWithFacebook: (accessToken: string) => Promise<boolean>;
  loginWithSocial: (accessToken: string, userData: any) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { name?: string; password?: string; picture?: string }) => Promise<boolean>;
  refreshUser: () => Promise<void>; // ฟังก์ชัน refresh ข้อมูล user
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 2. สร้าง Provider (ตัวหุ้มแอพ)
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 3. ฟังก์ชันเช็ค Login เมื่อเปิดแอพ
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('ultra_token');
        if (storedToken) {
          setToken(storedToken);
          // เรียก API /auth/profile เพื่อตรวจสอบว่า token ยังใช้ได้หรือไม่
          try {
            // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
            const userData = await api.get('/auth/profile');
            setUser(userData);
          } catch (e: any) {
            // ถ้า token หมดอายุหรือไม่ถูกต้อง (401) ให้ลบ token และ logout
            if (e.response?.status === 401) {
              console.log('Token expired or invalid, logging out...');
              await AsyncStorage.removeItem('ultra_token');
              setToken(null);
              setUser(null);
            } else {
              console.error('Failed to load user profile', e);
              // ถ้า error อื่นๆ ให้เก็บ token ไว้แต่ไม่ set user
              setUser(null);
            }
          }
        } else {
          setUser(null);
        }
      } catch (e) {
        console.error('Failed to load token', e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  // 4. ฟังก์ชัน Login (เรียก API ตาม PROMPT)
  const login = async (email: string, pass: string) => {
    try {
      setIsLoading(true);
      
      // 🚀 จำลองการ Login (สำหรับทดสอบ)
      // ถ้า email = "user" และ password = "12345678" ให้ Login สำเร็จ
      if (email === 'user' && pass === '12345678') {
        // จำลองข้อมูลที่ได้จาก API
        const mockAccessToken = 'mock_token_' + Date.now();
        const mockUser = {
          email: 'user',
          name: 'User',
          id: 'tb870683809744',
        };

        setToken(mockAccessToken);
        setUser(mockUser);
        
        await AsyncStorage.setItem('ultra_token', mockAccessToken);
        
        setIsLoading(false);
        return true; // Login สำเร็จ
      }

      // ถ้าไม่ใช่ user/12345678 ให้ลองเรียก API จริง
      try {
        // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
        const response = await api.post('/auth/login', {
          email: email,
          password: pass,
        });

        // Backend ส่ง access_token (snake_case) ไม่ใช่ accessToken (camelCase)
        const accessToken = response.access_token || response.accessToken;
        const user = response.user;

        // ตรวจสอบว่า accessToken ไม่เป็น undefined หรือ null
        if (!accessToken) {
          console.error('API Login failed: No access token in response', response);
          setIsLoading(false);
          return false;
        }

        setToken(accessToken);
        setUser(user);
        
        await AsyncStorage.setItem('ultra_token', accessToken);
        
        setIsLoading(false);
        return true; // Login สำเร็จ
      } catch (apiError: any) {
        console.error('API Login failed:', apiError);
        // ตรวจสอบ error response
        if (apiError.response) {
          console.error('Error response:', apiError.response.data || apiError.response);
        }
        setIsLoading(false);
        return false; // Login ล้มเหลว
      }
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false; // Login ล้มเหลว
    }
  };

  // 5. ฟังก์ชัน Login ด้วย Google (ส่ง id_token ไป Backend ตรวจสอบ)
  const loginWithGoogle = async (idToken: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/google', { token: idToken });
      const accessToken = response.access_token || response.accessToken;
      const userData = response.user;
      if (!accessToken || !userData) {
        setIsLoading(false);
        return false;
      }
      setToken(accessToken);
      setUser(userData);
      await AsyncStorage.setItem('ultra_token', accessToken);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Google login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // 5.1 ฟังก์ชัน Login ด้วย Facebook (ส่ง access_token ไป Backend ตรวจสอบ)
  const loginWithFacebook = async (accessToken: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/facebook', { token: accessToken });
      const jwt = response.access_token || response.accessToken;
      const userData = response.user;
      if (!jwt || !userData) {
        setIsLoading(false);
        return false;
      }
      setToken(jwt);
      setUser(userData);
      await AsyncStorage.setItem('ultra_token', jwt);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Facebook login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  // 5.2 ฟังก์ชัน Login ด้วย Social (Google, Facebook, etc.) - เก็บ token/user เอง (legacy)
  const loginWithSocial = async (accessToken: string, userData: any) => {
    setIsLoading(true);
    setToken(accessToken);
    setUser(userData);
    await AsyncStorage.setItem('ultra_token', accessToken);
    setIsLoading(false);
  };

  // 6. ฟังก์ชัน Logout
  const logout = async () => {
    setIsLoading(true);
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('ultra_token');
    setIsLoading(false);
  };

  // 7. ฟังก์ชัน Update Profile
  const updateProfile = async (data: { name?: string; password?: string; picture?: string }) => {
    try {
      setIsLoading(true);
      // ยิง API ไป Backend
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const response = await api.put('/users/me', data);

      // อัปเดต State ในเครื่องทันที
      if (user) {
        setUser({ ...user, ...response });
      }

      // (Optional) ถ้าแก้ Password อาจจะต้องบังคับ Login ใหม่ หรือ update token
      // แต่ในที่นี้เราสมมติว่า Token เดิมยังใช้ได้

      return true;
    } catch (error) {
      console.error('Update profile failed', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 8. ฟังก์ชัน Refresh User (ดึงข้อมูล user ใหม่จาก API)
  const refreshUser = async () => {
    if (!token) return;
    
    try {
      // ✅ Response Interceptor จะ unwrap แล้ว ไม่ต้องใช้ .data
      const userData = await api.get('/auth/profile');
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user', error);
      // ไม่ต้อง throw error เพื่อไม่ให้แอป crash
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isLoading,
        login,
        loginWithGoogle,
        loginWithFacebook,
        loginWithSocial,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 6. Custom Hook (เพื่อให้ใช้ง่าย)
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

