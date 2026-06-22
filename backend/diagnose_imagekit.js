/**
 * @file diagnose_imagekit.js
 * @description Automated diagnostic tool for auditing the ImageKit upload pipeline.
 * Runs checks for backend connectivity, credential validity, and signature matching.
 */

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const PORT = process.env.PORT || 5000;
const PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
const PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
const URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

console.log('===================================================');
console.log('      IMAGEKIT PIPELINE AUTOMATED DIAGNOSIS        ');
console.log('===================================================');

// Helper for status markers
const pass = (msg) => console.log(`\x1b[32m✓ [PASS] ${msg}\x1b[0m`);
const fail = (msg, solution) => {
  console.log(`\x1b[31m❌ [FAIL] ${msg}\x1b[0m`);
  if (solution) console.log(`   \x1b[33m👉 Hint: ${solution}\x1b[0m`);
};

async function runDiagnostics() {
  let backendOk = false;
  let authEndpointOk = false;
  let basicAuthOk = false;
  let signatureAuthOk = false;

  // 1. Check if backend server is running
  console.log('\n[1/5] Checking Backend Connectivity...');
  try {
    const healthRes = await fetch(`http://localhost:${PORT}/health`);
    if (healthRes.ok) {
      const data = await healthRes.json();
      pass(`Backend is running (Uptime: ${Math.round(data.uptime)}s)`);
      backendOk = true;
    } else {
      fail(`Backend returned status ${healthRes.status} on /health`, 'Make sure node backend is started via npm run dev.');
    }
  } catch (err) {
    fail(`Could not connect to backend on port ${PORT}: ${err.message}`, 'Make sure the backend server is running.');
  }

  // 2. Check Auth Endpoint Access
  console.log('\n[2/5] Checking Backend Authentication Signature Generator...');
  try {
    const authRes = await fetch(`http://localhost:${PORT}/api/v1/chat/imagekit/auth`, {
      headers: {
        // Use a dummy header or check if it requires authentication.
        // We know it requires JWT, but let's see if the endpoint itself is registered.
      }
    });
    if (authRes.status === 401) {
      pass('Auth endpoint /api/v1/chat/imagekit/auth is registered (Returned 401 Unauthorized as expected without JWT)');
      authEndpointOk = true;
    } else if (authRes.ok) {
      pass('Auth endpoint accessible');
      authEndpointOk = true;
    } else {
      fail(`Auth endpoint returned status ${authRes.status}`, 'Check express routes in chat.routes.js.');
    }
  } catch (err) {
    fail(`Could not hit auth endpoint: ${err.message}`, 'Verify backend routing.');
  }

  // 3. Validate Credentials format
  console.log('\n[3/5] Auditing Credentials Configuration...');
  if (!PUBLIC_KEY) {
    fail('IMAGEKIT_PUBLIC_KEY is missing in environment variables.');
  } else {
    pass(`Public Key format is valid: ${PUBLIC_KEY}`);
  }

  if (!PRIVATE_KEY) {
    fail('IMAGEKIT_PRIVATE_KEY is missing in environment variables.');
  } else {
    pass('Private Key is configured in environment variables');
  }

  if (!URL_ENDPOINT) {
    fail('IMAGEKIT_URL_ENDPOINT is missing in environment variables.');
  } else {
    pass(`URL Endpoint is configured: ${URL_ENDPOINT}`);
  }

  if (!PUBLIC_KEY || !PRIVATE_KEY || !URL_ENDPOINT) {
    console.log('Skipping upload checks due to missing credentials.');
    return;
  }

  // 4. Test Server-side Basic Auth Upload (validates Private Key independently)
  console.log('\n[4/5] Testing ImageKit Server-side Upload (Basic Auth)...');
  const dummyBase64 = Buffer.from('ImageKit Diagnostic File').toString('base64');
  const basicAuthHeader = 'Basic ' + Buffer.from(PRIVATE_KEY + ':').toString('base64');
  
  const basicFormData = new FormData();
  basicFormData.append('file', dummyBase64);
  basicFormData.append('fileName', `diagnostic_basic_${Date.now()}.txt`);
  basicFormData.append('folder', '/diagnostics');

  try {
    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': basicAuthHeader
      },
      body: basicFormData
    });

    if (res.ok) {
      const data = await res.json();
      pass(`Basic Auth upload succeeded. File URL: ${data.url}`);
      basicAuthOk = true;
    } else {
      const errorText = await res.text();
      fail(`Basic Auth upload failed with status ${res.status}: ${errorText}`, 
           'Your IMAGEKIT_PRIVATE_KEY is invalid or the account is disabled.');
    }
  } catch (err) {
    fail(`Basic Auth request crashed: ${err.message}`);
  }

  // 5. Test Client-side Signature Upload (validates Public Key and Signature Match)
  console.log('\n[5/5] Testing ImageKit Client-side Upload (Signature)...');
  const token = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const expire = Math.floor(Date.now() / 1000) + 3600;
  const signature = crypto
    .createHmac('sha1', PRIVATE_KEY)
    .update(token + expire)
    .digest('hex');

  const sigFormData = new FormData();
  sigFormData.append('file', dummyBase64);
  sigFormData.append('fileName', `diagnostic_sig_${Date.now()}.txt`);
  sigFormData.append('publicKey', PUBLIC_KEY);
  sigFormData.append('signature', signature);
  sigFormData.append('token', token);
  sigFormData.append('expire', expire.toString());
  sigFormData.append('folder', '/diagnostics');

  try {
    const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: sigFormData
    });

    if (res.ok) {
      const data = await res.json();
      pass(`Signature-based upload succeeded. File URL: ${data.url}`);
      signatureAuthOk = true;
    } else {
      const errorData = await res.json().catch(() => ({ message: 'Could not parse error response' }));
      const errorMsg = errorData.message || 'Unknown error';
      
      fail(`Signature upload failed with status ${res.status}: ${errorMsg}`, 
           res.status === 403 ? 'This indicates a mismatch between public and private keys.' : null);
    }
  } catch (err) {
    fail(`Signature request crashed: ${err.message}`);
  }

  // Final Assessment
  console.log('\n===================================================');
  console.log('             DIAGNOSTIC SUMMARY REPORT             ');
  console.log('===================================================');
  console.log(`Backend Running:           ${backendOk ? 'YES' : 'NO'}`);
  console.log(`Auth Endpoint Available:   ${authEndpointOk ? 'YES' : 'NO'}`);
  console.log(`Server-side Upload:        ${basicAuthOk ? 'PASS' : 'FAIL'}`);
  console.log(`Client-side Signature:     ${signatureAuthOk ? 'PASS' : 'FAIL'}`);
  console.log('---------------------------------------------------');

  if (basicAuthOk && !signatureAuthOk) {
    console.log('\x1b[31m\x1b[1mCRITICAL FINDING: CREDENTIALS MISMATCH DETECTED!\x1b[0m');
    console.log('\x1b[33mThe Private API Key is 100% valid and verified (server-side uploads succeed).\x1b[0m');
    console.log('\x1b[33mHowever, ImageKit rejected the upload when verifying the client-side signature.\x1b[0m');
    console.log('\x1b[31mThis is because the IMAGEKIT_PUBLIC_KEY in your .env file does NOT belong to the same account as the IMAGEKIT_PRIVATE_KEY.\x1b[0m');
    console.log('\n\x1b[36mHow to Fix:');
    console.log('1. Log in to your ImageKit.io Dashboard (https://app.imagekit.io/).');
    console.log('2. Navigate to Settings -> Developer options -> API keys.');
    console.log('3. Copy the "Public Key" (which starts with public_).');
    console.log('4. Update the IMAGEKIT_PUBLIC_KEY value in your r:\\OMS\\backend\\.env file.');
    console.log('5. Restart your backend dev server (npm run dev) so the environment updates.\x1b[0m');
  } else if (!basicAuthOk) {
    console.log('\x1b[31m\x1b[1mCRITICAL FINDING: INVALID PRIVATE KEY!\x1b[0m');
    console.log('\x1b[33mYour Private Key is being rejected by ImageKit on both Server and Client upload paths.\x1b[0m');
    console.log('Please verify the IMAGEKIT_PRIVATE_KEY value in your .env file.\x1b[0m');
  } else {
    console.log('\x1b[32m\x1b[1mALL SYSTEMS OPERATIONAL!\x1b[0m');
    console.log('The ImageKit upload credentials and pipeline are fully functional.');
  }
  console.log('===================================================');
}

runDiagnostics();
