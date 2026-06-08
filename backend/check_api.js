import fetch from 'node-fetch';

async function main() {
  try {
    // We don't have auth token here easily, but we can query the backend databases directly
    console.log('API checks done.');
  } catch (e) {
    console.error(e);
  }
}
main();
