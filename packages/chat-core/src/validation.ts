export const validateMessageContent = (content: string): boolean => {
  if (!content) return false;
  return content.trim().length > 0 && content.length <= 5000;
};

export const validateMediaSize = (sizeInBytes: number, maxMegaBytes: number = 50): boolean => {
  const maxBytes = maxMegaBytes * 1024 * 1024;
  return sizeInBytes <= maxBytes;
};
