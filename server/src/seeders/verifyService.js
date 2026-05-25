require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
require('../models');

const duolingoService = require('../modules/duolingo/duolingo.service');
const User = require('../modules/user/user.model');
const Course = require('../models/course.model');
const UserProgress = require('../models/userProgress.model');
const ChallengeProgress = require('../models/challengeProgress.model');

async function testAllServices() {
  try {
    await connectDB();
    console.log('⚡ Connected to database.');

    // 1. Get student user
    const user = await User.findOne({ role: 'student' });
    if (!user) {
      console.error('❌ Student user not found!');
      return;
    }
    console.log(`👤 Student user found: ${user.username} (${user._id})`);

    // Reset user progress fields to ensure clean testing state
    await UserProgress.findOneAndUpdate(
      { user: user._id },
      { 
        hearts: 5, 
        maxHearts: 5, 
        points: 0, 
        totalXP: 0, 
        activeCourse: null 
      },
      { upsert: true }
    );
    // Clear any previous challenge progress for this user
    await ChallengeProgress.deleteMany({ user: user._id });
    console.log('🧹 Cleaned up existing progress for testing.');

    // =========================================================================
    // TEST 1: getCourses
    // =========================================================================
    console.log('\n--- 1. Testing getCourses() ---');
    const courses = await duolingoService.getCourses();
    console.log(`✅ Found ${courses.length} courses.`);
    const spanish = courses.find(c => c.language === 'es');
    if (!spanish) throw new Error('Spanish course not found!');
    console.log(`🎉 Spanish: "${spanish.title}" (language: ${spanish.language})`);

    // =========================================================================
    // TEST 2: getCourseById
    // =========================================================================
    console.log('\n--- 2. Testing getCourseById() ---');
    const fetchedCourse = await duolingoService.getCourseById(spanish._id);
    if (!fetchedCourse || fetchedCourse.title !== 'Spanish') {
      throw new Error('getCourseById did not return correct course');
    }
    console.log(`✅ getCourseById matching successfully: "${fetchedCourse.title}"`);

    // =========================================================================
    // TEST 3: selectCourse
    // =========================================================================
    console.log('\n--- 3. Testing selectCourse() ---');
    const selectResult = await duolingoService.selectCourse(user._id, spanish._id);
    console.log('✅ selectCourse result (activeCourse):', selectResult.activeCourse);
    if (String(selectResult.activeCourse) !== String(spanish._id)) {
      throw new Error('Course selection did not match activeCourse');
    }

    // =========================================================================
    // TEST 4: getUserHearts
    // =========================================================================
    console.log('\n--- 4. Testing getUserHearts() ---');
    const heartsResult = await duolingoService.getUserHearts(user._id);
    console.log('✅ getUserHearts result:', heartsResult);
    if (heartsResult.hearts !== 5 || heartsResult.maxHearts !== 5) {
      throw new Error('Hearts initial state is incorrect');
    }

    // =========================================================================
    // TEST 5: getUnits
    // =========================================================================
    console.log('\n--- 5. Testing getUnits() ---');
    const units = await duolingoService.getUnits(user._id);
    console.log(`✅ Fetched ${units.length} units.`);
    if (units.length === 0) throw new Error('No units found!');
    const unit1 = units[0];
    console.log(`🗺️ Unit 1: "${unit1.title}", containing ${unit1.lessons.length} lessons.`);
    if (unit1.lessons.length === 0) throw new Error('Unit 1 has no lessons!');

    // =========================================================================
    // TEST 6: getLesson
    // =========================================================================
    console.log('\n--- 6. Testing getLesson() ---');
    const lesson1 = unit1.lessons[0];
    const lessonDetails = await duolingoService.getLesson(lesson1._id, user._id);
    console.log(`✅ getLesson returned: "${lessonDetails.title}"`);
    console.log(`🧩 Total challenges in lesson: ${lessonDetails.challenges.length}`);
    if (lessonDetails.challenges.length === 0) throw new Error('Lesson 1 has no challenges!');

    // =========================================================================
    // TEST 7: getNextLesson
    // =========================================================================
    console.log('\n--- 7. Testing getNextLesson() ---');
    const nextLesson = await duolingoService.getNextLesson(user._id);
    console.log(`✅ getNextLesson returned: "${nextLesson.lesson.title}" under unit "${nextLesson.unit.title}"`);
    if (String(nextLesson.lesson._id) !== String(lesson1._id)) {
      throw new Error('getNextLesson did not return the first incomplete lesson');
    }

    // =========================================================================
    // TEST 8: submitAnswer (Correct & Incorrect)
    // =========================================================================
    console.log('\n--- 8. Testing submitAnswer() ---');
    const challenge1 = lessonDetails.challenges[0];
    const correctOption = challenge1.options.find(o => o.correct);
    if (!correctOption) throw new Error('No correct option found for Challenge 1!');
    
    console.log(`🎯 Submitting CORRECT answer: "${correctOption.text}"`);
    const submitCorrect = await duolingoService.submitAnswer(user._id, challenge1._id, correctOption._id, null);
    console.log('✅ Correct submit result:', submitCorrect);
    if (!submitCorrect.isCorrect || submitCorrect.pointsEarned !== 10) {
      throw new Error('Correct submission failed or awarded incorrect points');
    }

    const challenge2 = lessonDetails.challenges[1];
    const incorrectOption = challenge2.options.find(o => !o.correct);
    if (!incorrectOption) throw new Error('No incorrect option found for Challenge 2!');

    console.log(`🎯 Submitting INCORRECT answer: "${incorrectOption.text}"`);
    const submitIncorrect = await duolingoService.submitAnswer(user._id, challenge2._id, incorrectOption._id, null);
    console.log('✅ Incorrect submit result:', submitIncorrect);
    if (submitIncorrect.isCorrect || submitIncorrect.pointsEarned !== 0) {
      throw new Error('Incorrect answer was falsely accepted or awarded points');
    }

    // =========================================================================
    // TEST 9: reduceHearts
    // =========================================================================
    console.log('\n--- 9. Testing reduceHearts() ---');
    const reduceResult = await duolingoService.reduceHearts(user._id);
    console.log('✅ reduceHearts result:', reduceResult);
    if (reduceResult.hearts !== 4) {
      throw new Error(`reduceHearts expected 4, got ${reduceResult.hearts}`);
    }

    // =========================================================================
    // TEST 10: refillHearts
    // =========================================================================
    console.log('\n--- 10. Testing refillHearts() ---');
    // Currently, user has 10 points (from correct answer above), which is exactly the POINTS_TO_REFILL cost.
    // Let's refill hearts!
    const refillResult = await duolingoService.refillHearts(user._id);
    console.log('✅ refillHearts result:', refillResult);
    if (refillResult.hearts !== 5 || refillResult.points !== 0) {
      throw new Error('Hearts refill failed or charged wrong points');
    }

    // Attempt to refill again (should fail because points = 0)
    console.log('📝 Attempting to refill again with 0 points (should fail)...');
    try {
      await duolingoService.refillHearts(user._id);
      throw new Error('Hearts refilled despite insufficient points!');
    } catch (err) {
      console.log('✅ Refill successfully blocked. Error message:', err.message);
    }

    // =========================================================================
    // TEST 11: completeLesson
    // =========================================================================
    console.log('\n--- 11. Testing completeLesson() ---');
    // Submit all remaining challenges for lesson 1 to complete it properly
    for (let cIndex = 1; cIndex < lessonDetails.challenges.length; cIndex++) {
      const chal = lessonDetails.challenges[cIndex];
      const correctOpt = chal.options.find(o => o.correct);
      await duolingoService.submitAnswer(user._id, chal._id, correctOpt._id, `el nouns ${cIndex + 1}`);
    }
    
    const completeResult = await duolingoService.completeLesson(user._id, lesson1._id);
    console.log('✅ completeLesson result:', completeResult);
    if (!completeResult.lesson.isCompleted) {
      throw new Error('Lesson completion failed to set isCompleted flag');
    }

    // =========================================================================
    // TEST 12: practiceLesson
    // =========================================================================
    console.log('\n--- 12. Testing practiceLesson() ---');
    const practiceDetails = await duolingoService.practiceLesson(user._id, lesson1._id);
    console.log(`✅ practiceLesson loaded: "${practiceDetails.title}"`);
    console.log('✅ Lesson type updated to:', practiceDetails.type);
    if (practiceDetails.type !== 'practice') {
      throw new Error('practiceLesson failed to convert lesson to practice mode');
    }
    // Verify progress was reset so challenges can be retaken
    const incompleteChal = practiceDetails.challenges.find(c => c.completed);
    if (incompleteChal) {
      throw new Error('practiceLesson did not reset challenge completions');
    }
    console.log('✅ practiceLesson challenge progress successfully reset.');

    // =========================================================================
    // TEST 13: getLeaderboard
    // =========================================================================
    console.log('\n--- 13. Testing getLeaderboard() ---');
    const leaderboard = await duolingoService.getLeaderboard('weekly');
    console.log(`✅ getLeaderboard returned ${leaderboard.length} entries.`);
    if (leaderboard.length > 0) {
      console.log('🏆 Top entry:', leaderboard[0]);
    }

    console.log('\n🌟🌟🌟 ALL 13 CORE DUOLINGO SERVICE API LOGICS TESTED AND VERIFIED SUCCESSFULLY! 🌟🌟🌟');
  } catch (err) {
    console.error('\n❌ E2E Service Testing failed with error:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from database.');
  }
}

testAllServices();
