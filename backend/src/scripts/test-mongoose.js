import mongoose from 'mongoose';
console.log('mongoose.Connection:', mongoose.Connection ? 'defined' : 'undefined');
console.log('mongoose.Connection.prototype:', mongoose.Connection.prototype ? 'defined' : 'undefined');
console.log('mongoose.Connection.prototype.model:', mongoose.Connection.prototype.model ? 'defined' : 'undefined');
console.log('mongoose.model:', mongoose.model ? 'defined' : 'undefined');
console.log('mongoose.models:', mongoose.models ? 'defined' : 'undefined');
process.exit(0);
