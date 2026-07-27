/**
 * @file pdfViewerService.ts
 * @description Utility service for downloading, caching, and opening PDF documents & payslips natively.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

export const pdfViewerService = {
  /**
   * Downloads a PDF file from a remote URL or base64 string, saves it locally, and opens the native share/view sheet.
   */
  async openPdf(urlOrBase64: string, fileName: string = 'Document.pdf'): Promise<boolean> {
    try {
      const sanitizedFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      const localUri = `${FileSystem.documentDirectory}${sanitizedFileName}`;

      if (urlOrBase64.startsWith('data:application/pdf') || urlOrBase64.startsWith('JVBERi0')) {
        // Base64 string payload
        const base64Data = urlOrBase64.includes('base64,')
          ? urlOrBase64.split('base64,')[1]
          : urlOrBase64;

        await FileSystem.writeAsStringAsync(localUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        // Remote HTTP/HTTPS URL
        const downloadRes = await FileSystem.downloadAsync(urlOrBase64, localUri);
        if (downloadRes.status !== 200) {
          throw new Error(`Failed to download PDF file (HTTP ${downloadRes.status})`);
        }
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Open ${sanitizedFileName}`,
          UTI: 'com.adobe.pdf',
        });
        return true;
      } else {
        Alert.alert('Sharing Unavailable', 'Native file sharing is not supported on this device.');
        return false;
      }
    } catch (err: any) {
      console.error('[pdfViewerService] Error opening PDF:', err);
      Alert.alert('Error Opening Document', err?.message || 'Could not load PDF document.');
      return false;
    }
  },
};

export default pdfViewerService;
