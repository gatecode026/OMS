import { uploadToImageKit } from './src/utils/imagekit.js';
import dotenv from 'dotenv';
dotenv.config();

const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function test() {
  console.log('Starting test upload to ImageKit...');
  try {
    const url = await uploadToImageKit(testBase64, 'test_pixel.png');
    console.log('Result URL:', url);
  } catch (error) {
    console.error('Test upload failed:', error);
  }
}
test();
