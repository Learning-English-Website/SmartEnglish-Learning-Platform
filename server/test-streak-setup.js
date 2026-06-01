const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./src/modules/user/user.model');

async function run() {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Vui lòng cung cấp email tài khoản cần test!');
    console.log('👉 Cú pháp: node test-streak-setup.js <email>');
    process.exit(1);
  }

  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('❌ Không tìm thấy MONGODB_URI trong file .env!');
    process.exit(1);
  }

  console.log('🔄 Đang kết nối tới database...');
  await mongoose.connect(dbUri);
  console.log('✅ Đã kết nối database thành công!');

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      console.error(`❌ Không tìm thấy tài khoản với email: ${email}`);
      process.exit(1);
    }

    // Thiết lập ngày học là 2 ngày trước (để bỏ lỡ ngày hôm qua)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    user.premium = 'premium';
    user.streakFreezes = 3;
    user.streak = {
      current: 5,               // Đặt chuỗi hiện tại là 5
      longest: 5,
      lastStudyDate: twoDaysAgo // Ngày học gần nhất là 2 ngày trước
    };

    await user.save();

    console.log('\n======================================================');
    console.log('🎉 CẤU HÌNH TÀI KHOẢN ĐỂ TEST STREAK FREEZE THÀNH CÔNG!');
    console.log('======================================================');
    console.log(`👤 Tài khoản:  ${user.email}`);
    console.log(`⭐ Premium:    ${user.premium}`);
    console.log(`❄️ Bảo hiểm:   ${user.streakFreezes} lượt`);
    console.log(`🔥 Streak:     ${user.streak.current} ngày (Gần nhất: 2 ngày trước)`);
    console.log('\n👉 HƯỚNG DẪN TEST:');
    console.log('1. Đăng nhập vào ứng dụng bằng tài khoản này.');
    console.log('2. Vào học thử một phiên học bất kỳ (ví dụ: Chế độ Học hoặc Khớp thẻ) để hoàn thành bài.');
    console.log('3. Hệ thống sẽ phát hiện bạn đã bỏ lỡ ngày hôm qua, tự động khấu trừ 1 lượt Bảo hiểm (còn 2/3).');
    console.log('4. Kiểm tra trang cá nhân: Chuỗi Streak của bạn sẽ tăng lên 6 ngày thành công (không bị reset về 1)!');
    console.log('======================================================\n');

  } catch (error) {
    console.error('❌ Có lỗi xảy ra trong quá trình thiết lập:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Đã ngắt kết nối database.');
  }
}

run();
