require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');
const FlashcardSet = require('../models/flashcardSet.model');
const Flashcard = require('../models/flashcard.model');
const User = require('../modules/user/user.model');

const sampleSets = [
  {
    title: 'Từ vựng IELTS - Chủ đề Môi trường',
    description: 'Học các từ vựng nâng cao về chủ đề Môi trường và Biến đổi khí hậu thường gặp trong bài thi IELTS.',
    isPublic: true,
    cards: [
      {
        front: 'Greenhouse effect',
        back: 'Hiệu ứng nhà kính',
        pronunciation: '/ˈɡriːnhaʊs ɪˈfekt/',
        example: 'The greenhouse effect is causing global temperatures to rise.',
        collocation: 'combat the greenhouse effect',
        relatedWords: 'global warming',
        difficulty: 2
      },
      {
        front: 'Biodiversity',
        back: 'Đa dạng sinh học',
        pronunciation: '/ˌbiːoʊdaɪˈvɜːrsəti/',
        example: 'The logging industry is a threat to the biodiversity of the rainforest.',
        collocation: 'preserve biodiversity',
        relatedWords: 'ecological diversity',
        difficulty: 3
      },
      {
        front: 'Sustainability',
        back: 'Sự phát triển bền vững',
        pronunciation: '/səˌsteɪnəˈbɪləti/',
        example: 'The company is committed to environmental sustainability.',
        collocation: 'achieve sustainability',
        relatedWords: 'eco-friendly',
        difficulty: 3
      },
      {
        front: 'Deforestation',
        back: 'Nạn phá rừng',
        pronunciation: '/ˌdiːˌfɔːrɪˈsteɪʃn/',
        example: 'Deforestation is destroying the natural habitats of many species.',
        collocation: 'stop deforestation',
        relatedWords: 'logging, forest clearing',
        difficulty: 2
      },
      {
        front: 'Renewable energy',
        back: 'Năng lượng tái tạo',
        pronunciation: '/rɪˈnuːəbl ˈenərdʒi/',
        example: 'Wind and solar power are forms of renewable energy.',
        collocation: 'invest in renewable energy',
        relatedWords: 'green energy',
        difficulty: 2
      },
      {
        front: 'Carbon footprint',
        back: 'Lượng khí thải carbon',
        pronunciation: '/ˈkɑːrbən ˈfʊtprɪnt/',
        example: 'We can reduce our carbon footprint by cycling instead of driving.',
        collocation: 'reduce carbon footprint',
        relatedWords: 'carbon emissions',
        difficulty: 2
      },
      {
        front: 'Conservation',
        back: 'Sự bảo tồn',
        pronunciation: '/ˌkɑːnsərˈveɪʃn/',
        example: 'Wildlife conservation is crucial to prevent extinction.',
        collocation: 'nature conservation',
        relatedWords: 'preservation',
        difficulty: 2
      },
      {
        front: 'Pollutant',
        back: 'Chất gây ô nhiễm',
        pronunciation: '/pəˈluːtənt/',
        example: 'Chemical pollutants are being dumped into the river.',
        collocation: 'harmful pollutants',
        relatedWords: 'contaminant',
        difficulty: 2
      },
      {
        front: 'Ecosystem',
        back: 'Hệ sinh thái',
        pronunciation: '/ˈiːkoʊsɪstəm/',
        example: 'The whole ecosystem of the lake was disrupted by the oil spill.',
        collocation: 'protect the ecosystem',
        relatedWords: 'ecological community',
        difficulty: 2
      },
      {
        front: 'Depletion',
        back: 'Sự suy kiệt',
        pronunciation: '/dɪˈpliːʃn/',
        example: 'The depletion of the ozone layer is a major environmental concern.',
        collocation: 'resource depletion',
        relatedWords: 'exhaustion, reduction',
        difficulty: 3
      }
    ]
  },
  {
    title: 'Tiếng Anh Thương Mại - TOEIC',
    description: 'Các từ vựng cốt lõi thường xuất hiện trong môi trường công sở và đề thi TOEIC.',
    isPublic: true,
    cards: [
      {
        front: 'Collaborate',
        back: 'Hợp tác',
        pronunciation: '/kəˈlæbəreɪt/',
        example: 'Researchers are collaborating with industry to develop new products.',
        collocation: 'collaborate on a project',
        relatedWords: 'cooperate, work together',
        difficulty: 2
      },
      {
        front: 'Negotiate',
        back: 'Đàm phán',
        pronunciation: '/nɪˈɡoʊʃieɪt/',
        example: 'We need to negotiate a new contract with our suppliers.',
        collocation: 'negotiate a deal',
        relatedWords: 'bargain, discuss terms',
        difficulty: 2
      },
      {
        front: 'Implement',
        back: 'Triển khai, thực hiện',
        pronunciation: '/ˈɪmplɪment/',
        example: 'The changes will be implemented next month.',
        collocation: 'implement a plan',
        relatedWords: 'execute, carry out',
        difficulty: 2
      },
      {
        front: 'Evaluate',
        back: 'Đánh giá',
        pronunciation: '/ɪˈvæljueɪt/',
        example: 'The committee will evaluate all the proposals before making a decision.',
        collocation: 'evaluate performance',
        relatedWords: 'assess, appraise',
        difficulty: 2
      },
      {
        front: 'Acquire',
        back: 'Mua lại, đạt được',
        pronunciation: '/əˈkwaɪər/',
        example: 'The company plans to acquire its main competitor.',
        collocation: 'acquire a company',
        relatedWords: 'obtain, purchase',
        difficulty: 3
      },
      {
        front: 'Merge',
        back: 'Sáp nhập',
        pronunciation: '/mɜːrdʒ/',
        example: 'The two banks merged to form the largest financial institution.',
        collocation: 'merge together',
        relatedWords: 'combine, unite',
        difficulty: 2
      },
      {
        front: 'Innovate',
        back: 'Đổi mới, sáng tạo',
        pronunciation: '/ˈiːnəveɪt/',
        example: 'To survive in this market, companies must constantly innovate.',
        collocation: 'innovate products',
        relatedWords: 'revolutionize',
        difficulty: 3
      },
      {
        front: 'Authorize',
        back: 'Ủy quyền, cho phép',
        pronunciation: '/ˈɔːθəraɪz/',
        example: 'Only authorized personnel are allowed to enter the building.',
        collocation: 'authorize a transaction',
        relatedWords: 'permit, approve',
        difficulty: 2
      },
      {
        front: 'Compensation',
        back: 'Sự đền bù, lương bổng',
        pronunciation: '/ˌkɑːmpenˈseɪʃn/',
        example: 'She received compensation for her travel expenses.',
        collocation: 'financial compensation',
        relatedWords: 'payment, salary',
        difficulty: 2
      },
      {
        front: 'Resign',
        back: 'Từ chức',
        pronunciation: '/rɪˈzaɪn/',
        example: 'The CEO decided to resign after the financial scandal.',
        collocation: 'resign from office',
        relatedWords: 'quit, step down',
        difficulty: 2
      }
    ]
  },
  {
    title: 'Thành ngữ tiếng Anh thông dụng',
    description: 'Học các thành ngữ tiếng Anh phổ biến giúp bạn giao tiếp tự nhiên như người bản xứ.',
    isPublic: true,
    cards: [
      {
        front: 'Break a leg',
        back: 'Chúc may mắn',
        pronunciation: '/breɪk ə leɡ/',
        example: 'Break a leg at your audition tonight!',
        collocation: 'break a leg tonight',
        relatedWords: 'good luck',
        difficulty: 1
      },
      {
        front: 'Bite the bullet',
        back: 'Cắn răng chịu đựng, đối mặt khó khăn',
        pronunciation: '/baɪt ðə ˈbʊlɪt/',
        example: 'I decided to bite the bullet and go to the dentist.',
        collocation: 'bite the bullet and do it',
        relatedWords: 'face the difficulty',
        difficulty: 2
      },
      {
        front: 'Under the weather',
        back: 'Không được khỏe',
        pronunciation: '/ˈʌndər ðə ˈweðər/',
        example: "I'm feeling a bit under the weather today, so I'm staying home.",
        collocation: 'feel under the weather',
        relatedWords: 'sick, unwell',
        difficulty: 1
      },
      {
        front: 'Spill the beans',
        back: 'Tiết lộ bí mật',
        pronunciation: '/spɪl ðə biːnz/',
        example: "Don't spill the beans about the surprise party!",
        collocation: 'spill the beans early',
        relatedWords: 'reveal a secret',
        difficulty: 2
      },
      {
        front: 'Hit the sack',
        back: 'Đi ngủ',
        pronunciation: '/hɪt ðə sæk/',
        example: "I'm exhausted, I think it's time to hit the sack.",
        collocation: 'time to hit the sack',
        relatedWords: 'go to bed',
        difficulty: 1
      },
      {
        front: 'A piece of cake',
        back: 'Dễ như ăn kẹo',
        pronunciation: '/wʌn piːs əv keɪk/',
        example: "Don't worry about the exam, it's going to be a piece of cake.",
        collocation: 'it is a piece of cake',
        relatedWords: 'easy, effortless',
        difficulty: 1
      },
      {
        front: 'Cost an arm and a leg',
        back: 'Rất đắt đỏ',
        pronunciation: '/kɔːst ən ɑːrm ænd ə leɡ/',
        example: 'That new smartphone costs an arm and a leg.',
        collocation: 'costs an arm and a leg',
        relatedWords: 'very expensive',
        difficulty: 2
      },
      {
        front: 'Once in a blue moon',
        back: 'Hiếm khi, năm thì mười họa',
        pronunciation: '/wʌns ɪn ə bluː muːn/',
        example: 'We only go out for dinner once in a blue moon.',
        collocation: 'happens once in a blue moon',
        relatedWords: 'rarely, seldom',
        difficulty: 2
      },
      {
        front: 'Burn the midnight oil',
        back: 'Thức khuya làm việc/học bài',
        pronunciation: '/bɜːrn ðə ˈmɪdnaɪt ɔɪl/',
        example: 'She is burning the midnight oil to prepare for her exam.',
        collocation: 'burning the midnight oil',
        relatedWords: 'study late, work late',
        difficulty: 2
      },
      {
        front: 'Let the cat out of the bag',
        back: 'Vô tình để lộ bí mật',
        pronunciation: '/let ðə kæt aʊt əv ðə bæɡ/',
        example: 'Who let the cat out of the bag about the wedding?',
        collocation: 'let the cat out of the bag',
        relatedWords: 'reveal accidentally',
        difficulty: 2
      }
    ]
  },
  {
    title: 'Chào hỏi & Giới thiệu bản thân',
    description: 'Các mẫu câu cơ bản để bắt đầu cuộc trò chuyện và giới thiệu bản thân một cách tự nhiên.',
    isPublic: true,
    cards: [
      {
        front: 'Hello',
        back: 'Xin chào',
        pronunciation: '/həˈloʊ/',
        example: 'Hello, how are you?',
        collocation: 'say hello to someone',
        relatedWords: 'hi, greetings',
        difficulty: 1
      },
      {
        front: 'Good morning',
        back: 'Chào buổi sáng',
        pronunciation: '/ɡʊd ˈmɔːrnɪŋ/',
        example: 'Good morning! Did you sleep well?',
        collocation: 'wish someone good morning',
        relatedWords: 'morning',
        difficulty: 1
      },
      {
        front: 'Nice to meet you',
        back: 'Rất vui được gặp bạn',
        pronunciation: '/naɪs tuː miːt juː/',
        example: "Nice to meet you! I'm Sarah.",
        collocation: 'nice to meet you too',
        relatedWords: 'pleased to meet you',
        difficulty: 1
      },
      {
        front: 'What is your name?',
        back: 'Tên bạn là gì?',
        pronunciation: '/wɒt ɪz jɔːr neɪm/',
        example: 'Hi! What is your name?',
        collocation: 'ask for someone\'s name',
        relatedWords: 'who are you',
        difficulty: 1
      },
      {
        front: 'My name is...',
        back: 'Tên tôi là...',
        pronunciation: '/maɪ neɪm ɪz/',
        example: 'My name is John. Nice to meet you!',
        collocation: 'introduce myself',
        relatedWords: 'I am...',
        difficulty: 1
      },
      {
        front: 'Where are you from?',
        back: 'Bạn đến từ đâu?',
        pronunciation: '/weər ɑːr juː frɒm/',
        example: "Where are you from? I'm from Vietnam.",
        collocation: 'be from somewhere',
        relatedWords: 'where do you live',
        difficulty: 1
      },
      {
        front: 'I am from Vietnam',
        back: 'Tôi đến từ Việt Nam',
        pronunciation: '/aɪ æm frɒm ˌviːetˈnɑːm/',
        example: 'I am from Vietnam. It is a beautiful country.',
        collocation: 'come from Vietnam',
        relatedWords: 'Vietnamese',
        difficulty: 1
      },
      {
        front: 'Goodbye',
        back: 'Tạm biệt',
        pronunciation: '/ɡʊdˈbaɪ/',
        example: 'Goodbye! See you tomorrow!',
        collocation: 'say goodbye',
        relatedWords: 'bye, farewell',
        difficulty: 1
      },
      {
        front: 'See you later',
        back: 'Hẹn gặp lại',
        pronunciation: '/siː juː ˈleɪtər/',
        example: 'See you later, have a great day!',
        collocation: 'see you later alligator',
        relatedWords: 'see you, catch you later',
        difficulty: 1
      },
      {
        front: 'Thank you',
        back: 'Cảm ơn',
        pronunciation: '/θæŋk juː/',
        example: 'Thank you for your help!',
        collocation: 'thank you very much',
        relatedWords: 'thanks, appreciate it',
        difficulty: 1
      }
    ]
  }
];

async function seedFlashcards() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.warn('⚠️ No admin user found, skipping flashcard seeding');
    return;
  }

  // Clear existing public sets created by admin to avoid duplicates and clean up empty ones
  const existingSets = await FlashcardSet.find({ user: admin._id, isPublic: true });
  const setIds = existingSets.map(s => s._id);
  
  await Flashcard.deleteMany({ set: { $in: setIds } });
  await FlashcardSet.deleteMany({ _id: { $in: setIds } });
  console.log('🧹 Cleaned up old admin public flashcards and sets');

  for (const setData of sampleSets) {
    const { cards, ...setInfo } = setData;
    
    const flashcardSet = await FlashcardSet.create({
      ...setInfo,
      user: admin._id,
      cardCount: cards.length,
    });

    const cardsWithSet = cards.map(card => ({
      ...card,
      set: flashcardSet._id,
    }));
    await Flashcard.insertMany(cardsWithSet);

    console.log(`✅ Seeded set: "${flashcardSet.title}" with ${cards.length} cards`);
  }
}

async function run() {
  try {
    await connectDB();
    await seedFlashcards();
    console.log('🎉 Flashcard seeder completed successfully!');
  } catch (error) {
    console.error('❌ Flashcard seeder failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
