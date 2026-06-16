import dotenv from 'dotenv';
dotenv.config();

console.log('--- DB-related ENV Keys ---');
Object.keys(process.env).forEach(key => {
  if (key.includes('URI') || key.includes('DB') || key.includes('CLUSTER')) {
    console.log(`${key}: ${process.env[key] ? 'DEFINED (length: ' + process.env[key].length + ')' : 'UNDEFINED'}`);
  }
});
