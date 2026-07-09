require('dns').setServers(['1.1.1.1']);
require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to DB');
  
  const rbacRoles = await mongoose.connection.db.collection('rbac_roles').find({}).toArray();
  console.log('rbac_roles:');
  rbacRoles.forEach(r => {
    console.log(r.id || r.roleId || r._id, JSON.stringify(r.permissions));
  });

  const roles = await mongoose.connection.db.collection('roles').find({}).toArray();
  console.log('roles:');
  roles.forEach(r => {
    console.log(r.id || r.roleId || r._id, JSON.stringify(r.permissions));
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
