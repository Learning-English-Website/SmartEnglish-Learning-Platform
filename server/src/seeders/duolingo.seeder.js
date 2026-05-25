const mongoose = require('mongoose');
const Course = require('../models/course.model');
const Unit = require('../models/unit.model');
const Lesson = require('../models/lesson.model');
const Challenge = require('../models/challenge.model');
const ChallengeOption = require('../models/challengeOption.model');

const seedDuolingo = async () => {
  console.log('🌱 Seeding Duolingo data...');

  // 1. Delete existing Duolingo challenges, challenge options, lessons, units, and courses to make seed clean and idempotent
  const targetLanguages = ['es', 'fr', 'it', 'de', 'ja'];
  
  // Find courses to clean up
  const coursesToClean = await Course.find({ language: { $in: targetLanguages } });
  const courseIds = coursesToClean.map(c => c._id);
  
  // Find units, lessons, challenges to clean
  const unitsToClean = await Unit.find({ course: { $in: courseIds } });
  const unitIds = unitsToClean.map(u => u._id);
  
  const lessonsToClean = await Lesson.find({ unit: { $in: unitIds } });
  const lessonIds = lessonsToClean.map(l => l._id);
  
  const challengesToClean = await Challenge.find({ lesson: { $in: lessonIds } });
  const challengeIds = challengesToClean.map(c => c._id);

  // Perform deletion
  await ChallengeOption.deleteMany({ challenge: { $in: challengeIds } });
  await Challenge.deleteMany({ lesson: { $in: lessonIds } });
  await Lesson.deleteMany({ unit: { $in: unitIds } });
  await Unit.deleteMany({ course: { $in: courseIds } });
  await Course.deleteMany({ language: { $in: targetLanguages } });

  console.log('🧹 Cleaned up existing Duolingo course data.');

  // 2. Seed courses
  const courses = [
    { title: 'Spanish', language: 'es', imageSrc: '/es.svg', difficulty: 'beginner', order: 0, slug: 'spanish-course', isPublished: true },
    { title: 'French', language: 'fr', imageSrc: '/fr.svg', difficulty: 'beginner', order: 1, slug: 'french-course', isPublished: true },
    { title: 'Italian', language: 'it', imageSrc: '/it.svg', difficulty: 'beginner', order: 2, slug: 'italian-course', isPublished: true },
    { title: 'German', language: 'de', imageSrc: '/de.svg', difficulty: 'beginner', order: 3, slug: 'german-course', isPublished: true },
    { title: 'Japanese', language: 'ja', imageSrc: '/ja.svg', difficulty: 'intermediate', order: 4, slug: 'japanese-course', isPublished: true },
  ];
  
  const createdCourses = [];
  for (const courseData of courses) {
    const course = await Course.create(courseData);
    createdCourses.push(course);
  }
  console.log(`✅ Seeded ${createdCourses.length} courses.`);

  // 3. Seed units & lessons & challenges for Spanish (as reference)
  const spanish = createdCourses.find(c => c.language === 'es');
  if (spanish) {
    const unit1 = await Unit.create({
      title: 'Unit 1: Learn the basics',
      description: 'Greet people, say hello, and ask for directions.',
      summary: 'Learn the basics of Spanish conversation',
      course: spanish._id,
      order: 0,
    });
    console.log(`✅ Seeded Spanish Unit 1.`);

    // 5 lessons per unit
    const lessonTitles = ['Nouns', 'Verbs', 'Adjectives', 'Phrases', 'Numbers'];
    for (let i = 0; i < 5; i++) {
      const lesson = await Lesson.create({
        title: lessonTitles[i],
        unit: unit1._id,
        order: i,
        type: 'challenge', // default challenge type
      });

      // 4 challenges per lesson
      for (let j = 0; j < 4; j++) {
        // We'll support SELECT, ASSIST, TYPE challenges
        let type = 'ASSIST';
        if (j === 0) type = 'SELECT';
        else if (j === 3) type = 'TYPE';

        let question = '';
        let correctAnswer = null;
        let imageSrc = null;

        if (type === 'SELECT') {
          question = `Which of these is the Spanish word for "${lessonTitles[i]} ${j + 1}"?`;
          imageSrc = `/images/challenges/${lessonTitles[i].toLowerCase()}_${j + 1}.png`;
        } else if (type === 'TYPE') {
          question = `Translate "${lessonTitles[i]} number ${j + 1}" to Spanish:`;
          correctAnswer = `el ${lessonTitles[i].toLowerCase()} ${j + 1}`;
        } else {
          question = `Translate: "This is a beautiful ${lessonTitles[i].toLowerCase()}."`;
        }

        const challenge = await Challenge.create({
          lesson: lesson._id,
          type,
          question,
          correctAnswer,
          imageSrc: type === 'SELECT' ? imageSrc : null,
          audioSrc: `/audio/challenges/${lesson._id}_${j + 1}.mp3`,
          order: j,
        });

        // 4 options per challenge
        const correctOption = await ChallengeOption.create({
          challenge: challenge._id,
          text: correctAnswer || `el ${lessonTitles[i].toLowerCase()} ${j + 1}`,
          correct: true,
          imageSrc: type === 'SELECT' ? `/images/options/${lessonTitles[i].toLowerCase()}_correct.png` : null,
          audioSrc: `/audio/options/correct_${j + 1}.mp3`
        });

        for (let k = 1; k <= 3; k++) {
          await ChallengeOption.create({
            challenge: challenge._id,
            text: `Wrong ${lessonTitles[i]} Option ${k}`,
            correct: false,
            imageSrc: type === 'SELECT' ? `/images/options/${lessonTitles[i].toLowerCase()}_wrong_${k}.png` : null,
            audioSrc: `/audio/options/wrong_${k}.mp3`
          });
        }
      }
    }
    console.log(`✅ Seeded 5 lessons, 20 challenges, and 80 options for Spanish Course.`);
  }

  console.log('✅ Duolingo seeding completed successfully!');
};

module.exports = { seedDuolingo };
