import React, { createContext, useContext, useState } from 'react';

export type ChatSheetType = 'actions' | 'attachments' | 'emoji' | null;

interface BottomSheetContextProps {
  activeSheet: ChatSheetType;
  sheetData: any;
  openSheet: (type: ChatSheetType, data?: any) => void;
  closeSheet: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextProps | null>(null);

export const BottomSheetManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSheet, setActiveSheet] = useState<ChatSheetType>(null);
  const [sheetData, setSheetData] = useState<any>(null);

  const openSheet = (type: ChatSheetType, data?: any) => {
    setActiveSheet(type);
    setSheetData(data || null);
  };

  const closeSheet = () => {
    setActiveSheet(null);
    setSheetData(null);
  };

  return (
    <BottomSheetContext.Provider value={{ activeSheet, sheetData, openSheet, closeSheet }}>
      {children}
    </BottomSheetContext.Provider>
  );
};

export const useBottomSheetManager = () => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useBottomSheetManager must be used within a BottomSheetManagerProvider');
  }
  return context;
};
export default BottomSheetManagerProvider;
