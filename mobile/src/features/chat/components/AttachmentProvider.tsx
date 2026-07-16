import React, { createContext, useContext } from 'react';

export interface AttachmentPlugin {
  id: string;
  label: string;
  icon: string;
  backgroundColor: string;
  iconColor: string;
  action: () => void;
}

interface AttachmentContextProps {
  plugins: AttachmentPlugin[];
}

const AttachmentContext = createContext<AttachmentContextProps | null>(null);

export const AttachmentProvider: React.FC<{ plugins: AttachmentPlugin[]; children: React.ReactNode }> = ({ plugins, children }) => {
  return (
    <AttachmentContext.Provider value={{ plugins }}>
      {children}
    </AttachmentContext.Provider>
  );
};

export const useAttachmentPlugins = () => {
  const context = useContext(AttachmentContext);
  if (!context) {
    throw new Error('useAttachmentPlugins must be used within an AttachmentProvider');
  }
  return context.plugins;
};
export default AttachmentProvider;
