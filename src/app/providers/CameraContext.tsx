// context/CameraContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CameraType } from 'expo-camera';

interface CameraContextType {
  facing: CameraType;
  toggleCameraFacing: () => void;
  enableTorch: boolean;
  setEnableTorch: (value: boolean) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [enableTorch, setEnableTorch] = useState(false);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <CameraContext.Provider value={{ facing, toggleCameraFacing, enableTorch, setEnableTorch }}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = () => {
  const context = useContext(CameraContext);
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
};

