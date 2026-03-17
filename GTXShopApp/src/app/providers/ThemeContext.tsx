import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '@app/providers/AuthContext';
import client from '@app/api/client';
import { Colors } from '@shared/constants/Colors';

interface ThemeContextProps {
  theme: 'light' | 'dark';
  colors: typeof Colors.light;
  toggleTheme: () => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextProps>({} as any);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (user?.theme === 'light' || user?.theme === 'dark') {
      // ถ้ามีธีมที่ผู้ใช้บันทึกไว้ ให้ใช้ค่านั้น
      setTheme(user.theme as 'light' | 'dark');
    } else {
      // ค่าเริ่มต้นเสมอ: โหมดสว่าง (Light Mode)
      setTheme('light');
    }
  }, [user]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    if (user) {
      try {
        await client.put('/users/me', { theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme', error);
      }
    }
  };

  const colors = Colors[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

