const mongoose = require('mongoose');
require('dotenv').config({ path: 'server/.env.development' });
require('../server/src/modules/user/user.model');
const Order = require('../server/src/models/order.model');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const orders = await Order.find().populate('user');
  const validOrder = orders.find(o => o.user !== null);
  console.log(JSON.stringify(validOrder, null, 2));
  process.exit(0);
}
run();
