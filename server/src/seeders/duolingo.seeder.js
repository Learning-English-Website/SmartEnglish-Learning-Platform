const Course = require('../models/course.model');
const Unit = require('../models/unit.model');
const Lesson = require('../models/lesson.model');
const Challenge = require('../models/challenge.model');
const ChallengeOption = require('../models/challengeOption.model');

const courseData = [
  // ============================================================
  // COURSE 1: BASICS - Beginner English
  // ============================================================
  {
    course: {
      slug: 'basics',
      title: 'Basics',
      description: 'Start learning English from scratch with essential words and phrases.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'beginner',
      order: 0,
      isPublished: true,
      thumbnailUrl: 'https://cdn.duolingo.com/image/basics.png',
      imageSrc: 'https://cdn.duolingo.com/image/basics.png',
      language: 'en',
      difficulty: 'beginner',
      isActive: true,
    },
    units: [
      {
        title: 'Words',
        description: 'Learn your first English words',
        order: 0,
        lessons: [
          {
            title: 'Greetings',
            order: 0,
            challenges: [
              // 1: SELECT - Dạng chọn đầu tiên, làm quen
              { type: 'SELECT', question: 'Which word means "Hello"?', correctAnswer: null, options: [{ text: 'Hello', correct: true }, { text: 'Goodbye', correct: false }, { text: 'Thank you', correct: false }, { text: 'Please', correct: false }] },
              
              // 2: LISTEN - Nghe và viết câu đầu tiên
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Good morning', wordBank: ['morning', 'Good', 'afternoon', 'evening', 'night', 'today', 'tomorrow'] },
              
              // 3: ASSIST - Chọn nghĩa tiếng Việt
              { type: 'ASSIST', question: 'What does "Xin chào" mean?', correctAnswer: 'Hello', options: [{ text: 'Hello', correct: true }, { text: 'Goodbye', correct: false }, { text: 'Sorry', correct: false }, { text: 'Yes', correct: false }] },
              
              // 4: LISTEN - Nghe và viết câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'How are you', wordBank: ['are', 'How', 'you', 'am', 'is', 'fine', 'good', 'doing'] },
              
              // 5: TYPE - Nhập từ
              { type: 'TYPE', question: 'Type the word for a greeting: _ _ _ _ _', correctAnswer: 'Hello', options: [] },
              
              // 6: LISTEN - Nghe và viết câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Nice to meet you', wordBank: ['to', 'you', 'Nice', 'meet', 'see', 'Hello', 'again', 'too'] },
              
              // 7: ORDER - Sắp xếp từ thành câu
              { type: 'ORDER', question: 'Arrange: are / How / you', correctAnswer: null, wordBank: ['are', 'How', 'you'], correctOrder: [1, 0, 2], options: [] },
              
              // 8: SELECT - Chọn câu tiếp theo
              { type: 'SELECT', question: 'Which is a greeting?', correctAnswer: null, options: [{ text: 'Hi', correct: true }, { text: 'No', correct: false }, { text: 'Stop', correct: false }, { text: 'Eat', correct: false }] },
              
              // 9: LISTEN - Nghe và viết câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'See you tomorrow', wordBank: ['See', 'tomorrow', 'you', 'today', 'Goodbye', 'later', 'morning', 'again'] },
              
              // 10: ASSIST - Chọn nghĩa tiếng Việt thứ 2
              { type: 'ASSIST', question: '"Tạm biệt" in English?', correctAnswer: 'Goodbye', options: [{ text: 'Goodbye', correct: true }, { text: 'Hello', correct: false }, { text: 'Welcome', correct: false }, { text: 'Sorry', correct: false }] },
              
              // 11: LISTEN - Nghe và viết câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Thank you very much', wordBank: ['Thank', 'you', 'very', 'much', 'Thanks', 'alot', 'please', 'sorry'] },
              
              // 12: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: Nice to ___ you', correctAnswer: 'meet', sentence: 'Nice to ___ you', options: [] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: morning / Good / !', correctAnswer: null, wordBank: ['morning', 'Good', '!'], correctOrder: [1, 0, 2], options: [] },
              
              // 14: TYPE - Nhập từ thứ 2
              { type: 'TYPE', question: 'Type the word for saying bye: _ _ _ _ _ _ _', correctAnswer: 'Goodbye', options: [] },
              
              // 15: MATCH - Nối cặp
              { type: 'MATCH', question: 'Match the Vietnamese with English', correctAnswer: null, pairs: [{ left: 'Xin chào', right: 'Hello' }, { left: 'Tạm biệt', right: 'Goodbye' }, { left: 'Cảm ơn', right: 'Thank you' }, { left: 'Xin lỗi', right: 'Sorry' }], options: [] },
              
              // 16: TRANSLATE - Dịch câu
              { type: 'TRANSLATE', question: 'Type the English: "Xin chào, tôi là Anna"', correctAnswer: 'Hello, I am Anna', options: [] },
              
              // 17: TRANSLATE - Dịch câu thứ 2
              { type: 'TRANSLATE', question: 'Type the English: "Hẹn gặp lại sau"', correctAnswer: 'See you later', options: [] },
              
              // 18: FILL - Chọn từ điền vào chỗ trống
              { type: 'FILL', question: 'Fill in the blank: Good ___!', correctAnswer: null, options: [{ text: 'morning', correct: true }, { text: 'night', correct: false }, { text: 'bye', correct: false }, { text: 'day', correct: false }] },
            ],
          },
          {
            title: 'Numbers 1-10',
            order: 1,
            challenges: [
              // 1: SELECT - Chọn số đầu tiên
              { type: 'SELECT', question: 'What number is "1"?', correctAnswer: null, options: [{ text: 'One', correct: true }, { text: 'Two', correct: false }, { text: 'Three', correct: false }, { text: 'Four', correct: false }] },
              
              // 2: LISTEN - Nghe và viết câu đầu
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I have three apples', wordBank: ['have', 'I', 'three', 'apples', 'two', 'five', 'four', 'one'] },
              
              // 3: ASSIST - Chọn nghĩa tiếng Việt
              { type: 'ASSIST', question: 'What is "2" in English?', correctAnswer: 'Two', options: [{ text: 'Two', correct: true }, { text: 'One', correct: false }, { text: 'Three', correct: false }, { text: 'Four', correct: false }] },
              
              // 4: LISTEN - Nghe câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'There are five people', wordBank: ['are', 'There', 'five', 'people', 'four', 'six', 'three', 'seven'] },
              
              // 5: TYPE - Nhập số
              { type: 'TYPE', question: 'Type the number 5 in English: _ _ _ _', correctAnswer: 'Five', options: [] },
              
              // 6: LISTEN - Nghe câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'One two three four', wordBank: ['One', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'] },
              
              // 7: SELECT - Chọn số tiếp theo
              { type: 'SELECT', question: 'Which word means "10"?', correctAnswer: null, options: [{ text: 'Ten', correct: true }, { text: 'Nine', correct: false }, { text: 'Eight', correct: false }, { text: 'Seven', correct: false }] },
              
              // 8: LISTEN - Nghe câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'She has seven books', wordBank: ['has', 'She', 'seven', 'books', 'six', 'eight', 'nine', 'ten'] },
              
              // 9: MATCH - Nối cặp số
              { type: 'MATCH', question: 'Match the numbers', correctAnswer: null, pairs: [{ left: '1', right: 'One' }, { left: '2', right: 'Two' }, { left: '3', right: 'Three' }, { left: '4', right: 'Four' }], options: [] },
              
              // 10: LISTEN - Nghe câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'We count to ten', wordBank: ['We', 'count', 'to', 'ten', 'five', 'eight', 'nine', 'seven'] },
              
              // 11: ORDER - Sắp xếp từ
              { type: 'ORDER', question: 'Arrange: have / I / two / books', correctAnswer: null, wordBank: ['have', 'I', 'two', 'books'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 12: ASSIST - Chọn nghĩa tiếng Việt thứ 2
              { type: 'ASSIST', question: '"Bảy" in English?', correctAnswer: 'Seven', options: [{ text: 'Seven', correct: true }, { text: 'Six', correct: false }, { text: 'Eight', correct: false }, { text: 'Five', correct: false }] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: are / There / four / cats', correctAnswer: null, wordBank: ['are', 'There', 'four', 'cats'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 14: TYPE - Nhập số thứ 2
              { type: 'TYPE', question: 'Type the word for "8": _ _ _ _', correctAnswer: 'Eight', options: [] },
              
              // 15: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: I have ___ dogs.', correctAnswer: 'three', sentence: 'I have ___ dogs.', options: [] },
              
              // 16: COMPLETE - Hoàn thành câu thứ 2
              { type: 'COMPLETE', question: 'Complete: There are ___ cats.', correctAnswer: 'four', sentence: 'There are ___ cats.', options: [] },
              
              // 17: FILL - Chọn số điền vào chỗ trống
              { type: 'FILL', question: 'Fill in the blank: One, Two, Three, ___', correctAnswer: null, options: [{ text: 'Four', correct: true }, { text: 'Five', correct: false }, { text: 'Six', correct: false }, { text: 'Two', correct: false }] },
              
              // 18: FILL - Chọn số thứ 2
              { type: 'FILL', question: 'Fill in the blank: Five, Six, Seven, ___', correctAnswer: null, options: [{ text: 'Eight', correct: true }, { text: 'Nine', correct: false }, { text: 'Ten', correct: false }, { text: 'Six', correct: false }] },
            ],
          },
          {
            title: 'Colors',
            order: 2,
            challenges: [
              // 1: SELECT - Chọn màu đầu tiên
              { type: 'SELECT', question: 'What color is the sky?', correctAnswer: null, options: [{ text: 'Blue', correct: true }, { text: 'Red', correct: false }, { text: 'Green', correct: false }, { text: 'Yellow', correct: false }] },
              
              // 2: LISTEN - Nghe câu đầu
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'The sky is blue', wordBank: ['The', 'sky', 'is', 'blue', 'red', 'green', 'yellow', 'white'] },
              
              // 3: ASSIST - Chọn nghĩa tiếng Việt
              { type: 'ASSIST', question: 'What does "Đỏ" mean?', correctAnswer: 'Red', options: [{ text: 'Red', correct: true }, { text: 'Blue', correct: false }, { text: 'Green', correct: false }, { text: 'Black', correct: false }] },
              
              // 4: LISTEN - Nghe câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'The apple is red', wordBank: ['apple', 'The', 'is', 'red', 'blue', 'green', 'yellow', 'orange'] },
              
              // 5: TYPE - Nhập từ màu
              { type: 'TYPE', question: 'Type the color of grass: _ _ _ _ _', correctAnswer: 'Green', options: [] },
              
              // 6: LISTEN - Nghe câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'The sun is yellow', wordBank: ['sun', 'is', 'yellow', 'The', 'red', 'blue', 'green', 'orange'] },
              
              // 7: SELECT - Chọn màu tiếp theo
              { type: 'SELECT', question: 'What color is grass?', correctAnswer: null, options: [{ text: 'Green', correct: true }, { text: 'Blue', correct: false }, { text: 'Red', correct: false }, { text: 'Black', correct: false }] },
              
              // 8: LISTEN - Nghe câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I like the color green', wordBank: ['like', 'I', 'the', 'green', 'color', 'red', 'blue', 'yellow'] },
              
              // 9: ORDER - Sắp xếp từ
              { type: 'ORDER', question: 'Arrange: is / The / sky / blue', correctAnswer: null, wordBank: ['is', 'The', 'sky', 'blue'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 10: LISTEN - Nghe câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'My car is white', wordBank: ['My', 'car', 'is', 'white', 'red', 'blue', 'black', 'yellow'] },
              
              // 11: ASSIST - Chọn nghĩa tiếng Việt thứ 2
              { type: 'ASSIST', question: '"Trắng" in English?', correctAnswer: 'White', options: [{ text: 'White', correct: true }, { text: 'Black', correct: false }, { text: 'Gray', correct: false }, { text: 'Brown', correct: false }] },
              
              // 12: TYPE - Nhập từ màu thứ 2
              { type: 'TYPE', question: 'Type the color of the sun: _ _ _ _ _ _', correctAnswer: 'Yellow', options: [] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: car / is / My / red', correctAnswer: null, wordBank: ['car', 'is', 'My', 'red'], correctOrder: [2, 1, 0, 3], options: [] },
              
              // 14: MATCH - Nối màu
              { type: 'MATCH', question: 'Match the colors', correctAnswer: null, pairs: [{ left: 'Đỏ', right: 'Red' }, { left: 'Xanh da trời', right: 'Blue' }, { left: 'Xanh lá', right: 'Green' }, { left: 'Vàng', right: 'Yellow' }], options: [] },
              
              // 15: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: The apple is ___.', correctAnswer: 'red', sentence: 'The apple is ___.', options: [] },
              
              // 16: COMPLETE - Hoàn thành câu thứ 2
              { type: 'COMPLETE', question: 'Complete: My car is ___.', correctAnswer: 'blue', sentence: 'My car is ___.', options: [] },
              
              // 17: FILL - Chọn màu điền vào chỗ trống
              { type: 'FILL', question: 'Fill: The banana is ___', correctAnswer: null, options: [{ text: 'Yellow', correct: true }, { text: 'Red', correct: false }, { text: 'Blue', correct: false }, { text: 'Green', correct: false }] },
              
              // 18: FILL - Chọn màu thứ 2
              { type: 'FILL', question: 'Fill: The night is ___', correctAnswer: null, options: [{ text: 'Black', correct: true }, { text: 'White', correct: false }, { text: 'Yellow', correct: false }, { text: 'Blue', correct: false }] },
            ],
          },
          {
            title: 'Family',
            order: 3,
            challenges: [
              // 1: SELECT - Chọn từ đầu tiên
              { type: 'SELECT', question: 'Who is your mother\'s daughter?', correctAnswer: null, options: [{ text: 'Sister', correct: true }, { text: 'Brother', correct: false }, { text: 'Father', correct: false }, { text: 'Uncle', correct: false }] },
              
              // 2: LISTEN - Nghe câu đầu
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'This is my family', wordBank: ['This', 'is', 'my', 'family', 'the', 'a', 'house', 'home'] },
              
              // 3: ASSIST - Chọn nghĩa tiếng Việt
              { type: 'ASSIST', question: 'What does "Anh trai" mean?', correctAnswer: 'Brother', options: [{ text: 'Brother', correct: true }, { text: 'Sister', correct: false }, { text: 'Mother', correct: false }, { text: 'Father', correct: false }] },
              
              // 4: LISTEN - Nghe câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'My mother is kind', wordBank: ['mother', 'My', 'is', 'kind', 'father', 'nice', 'good', 'tall'] },
              
              // 5: TYPE - Nhập từ
              { type: 'TYPE', question: 'Type the word for your male parent: _ _ _ _ _ _', correctAnswer: 'Father', options: [] },
              
              // 6: LISTEN - Nghe câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I have two sisters', wordBank: ['have', 'I', 'two', 'sisters', 'brothers', 'three', 'four', 'one'] },
              
              // 7: SELECT - Chọn từ tiếp theo
              { type: 'SELECT', question: 'Who is your father\'s son?', correctAnswer: null, options: [{ text: 'Brother', correct: true }, { text: 'Sister', correct: false }, { text: 'Mother', correct: false }, { text: 'Aunt', correct: false }] },
              
              // 8: LISTEN - Nghe câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'My brother is tall', wordBank: ['brother', 'My', 'is', 'tall', 'short', 'sister', 'old', 'young'] },
              
              // 9: ORDER - Sắp xếp từ
              { type: 'ORDER', question: 'Arrange: is / This / my / mother', correctAnswer: null, wordBank: ['is', 'This', 'my', 'mother'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 10: LISTEN - Nghe câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I love my family', wordBank: ['love', 'I', 'my', 'family', 'like', 'the', 'you', 'very'] },
              
              // 11: ASSIST - Chọn nghĩa tiếng Việt thứ 2
              { type: 'ASSIST', question: '"Chị gái" in English?', correctAnswer: 'Sister', options: [{ text: 'Sister', correct: true }, { text: 'Brother', correct: false }, { text: 'Aunt', correct: false }, { text: 'Mother', correct: false }] },
              
              // 12: TYPE - Nhập từ thứ 2
              { type: 'TYPE', question: 'Type the word for your female parent: _ _ _ _ _ _', correctAnswer: 'Mother', options: [] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: have / I / two / sisters', correctAnswer: null, wordBank: ['have', 'I', 'two', 'sisters'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 14: MATCH - Nối cặp
              { type: 'MATCH', question: 'Match family terms', correctAnswer: null, pairs: [{ left: 'Mẹ', right: 'Mother' }, { left: 'Cha', right: 'Father' }, { left: 'Anh', right: 'Brother' }, { left: 'Em gái', right: 'Sister' }], options: [] },
              
              // 15: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: My ___ is a teacher.', correctAnswer: 'mother', sentence: 'My ___ is a teacher.', options: [] },
              
              // 16: COMPLETE - Hoàn thành câu thứ 2
              { type: 'COMPLETE', question: 'Complete: I have one ___', correctAnswer: 'brother', sentence: 'I have one ___', options: [] },
              
              // 17: FILL - Chọn từ
              { type: 'FILL', question: 'Fill: My ___ is married.', correctAnswer: null, options: [{ text: 'sister', correct: true }, { text: 'brother', correct: false }, { text: 'mother', correct: false }, { text: 'father', correct: false }] },
              
              // 18: FILL - Chọn từ thứ 2
              { type: 'FILL', question: 'Fill: This is my ___ daughter.', correctAnswer: null, options: [{ text: 'her', correct: true }, { text: 'my', correct: false }, { text: 'his', correct: false }, { text: 'their', correct: false }] },
            ],
          },
          {
            title: 'Common Objects',
            order: 4,
            challenges: [
              // 1: SELECT - Chọn đồ vật đầu tiên
              { type: 'SELECT', question: 'What do you read?', correctAnswer: null, options: [{ text: 'Book', correct: true }, { text: 'Apple', correct: false }, { text: 'Water', correct: false }, { text: 'Car', correct: false }] },
              
              // 2: LISTEN - Nghe câu đầu
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'This is my book', wordBank: ['This', 'is', 'my', 'book', 'the', 'a', 'pen', 'notebook'] },
              
              // 3: ASSIST - Chọn đáp án đúng
              { type: 'ASSIST', question: 'What does "Quả táo" mean?', correctAnswer: 'Apple', options: [{ text: 'Apple', correct: true }, { text: 'Orange', correct: false }, { text: 'Banana', correct: false }, { text: 'Grape', correct: false }] },
              
              // 4: LISTEN - Nghe câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'The cat is on the table', wordBank: ['cat', 'The', 'is', 'on', 'table', 'chair', 'bed', 'floor'] },
              
              // 5: TYPE - Nhập từ
              { type: 'TYPE', question: 'Type the drink you need: _ _ _ _ _', correctAnswer: 'Water', options: [] },
              
              // 6: LISTEN - Nghe câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I have a new phone', wordBank: ['have', 'I', 'a', 'new', 'phone', 'car', 'book', 'bag'] },
              
              // 7: SELECT - Chọn đồ vật tiếp theo
              { type: 'SELECT', question: 'Which is a vehicle?', correctAnswer: null, options: [{ text: 'Car', correct: true }, { text: 'House', correct: false }, { text: 'Tree', correct: false }, { text: 'Dog', correct: false }] },
              
              // 8: LISTEN - Nghe câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Where is my pen', wordBank: ['Where', 'is', 'my', 'pen', 'book', 'bag', 'the', 'your'] },
              
              // 9: ORDER - Sắp xếp từ
              { type: 'ORDER', question: 'Arrange: is / The / on / table / it', correctAnswer: null, wordBank: ['is', 'The', 'on', 'table', 'it'], correctOrder: [1, 0, 2, 3, 4], options: [] },
              
              // 10: LISTEN - Nghe câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'The house is big', wordBank: ['house', 'The', 'is', 'big', 'small', 'new', 'old', 'red'] },
              
              // 11: ASSIST - Chọn đáp án đúng thứ 2
              { type: 'ASSIST', question: '"Con mèo" in English?', correctAnswer: 'Cat', options: [{ text: 'Cat', correct: true }, { text: 'Dog', correct: false }, { text: 'Bird', correct: false }, { text: 'Fish', correct: false }] },
              
              // 12: TYPE - Nhập từ thứ 2
              { type: 'TYPE', question: 'Type what you sit on: _ _ _ _', correctAnswer: 'Chair', options: [] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: have / I / a / new / car', correctAnswer: null, wordBank: ['have', 'I', 'a', 'new', 'car'], correctOrder: [1, 0, 2, 3, 4], options: [] },
              
              // 14: MATCH - Nối cặp
              { type: 'MATCH', question: 'Match the objects', correctAnswer: null, pairs: [{ left: 'Sách', right: 'Book' }, { left: 'Bút', right: 'Pen' }, { left: 'Bàn', right: 'Table' }, { left: 'Ghế', right: 'Chair' }], options: [] },
              
              // 15: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: The ___ is on the table.', correctAnswer: 'book', sentence: 'The ___ is on the table.', options: [] },
              
              // 16: COMPLETE - Hoàn thành câu thứ 2
              { type: 'COMPLETE', question: 'Complete: I need a ___', correctAnswer: 'pen', sentence: 'I need a ___', options: [] },
              
              // 17: FILL - Chọn từ
              { type: 'FILL', question: 'Fill: The ___ is red.', correctAnswer: null, options: [{ text: 'apple', correct: true }, { text: 'water', correct: false }, { text: 'book', correct: false }, { text: 'car', correct: false }] },
              
              // 18: FILL - Chọn từ thứ 2
              { type: 'FILL', question: 'Fill: I have a new ___', correctAnswer: null, options: [{ text: 'phone', correct: true }, { text: 'water', correct: false }, { text: 'book', correct: false }, { text: 'table', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Phrases',
        description: 'Learn basic English phrases',
        order: 1,
        lessons: [
          {
            title: 'Essential Phrases',
            order: 0,
            challenges: [
              // 1: SELECT - Chọn cụm từ đầu tiên
              { type: 'SELECT', question: 'How do you say "Cảm ơn" in English?', correctAnswer: null, options: [{ text: 'Thank you', correct: true }, { text: 'Please', correct: false }, { text: 'Sorry', correct: false }, { text: 'Hello', correct: false }] },
              
              // 2: LISTEN - Nghe câu đầu
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Thank you very much', wordBank: ['Thank', 'you', 'very', 'much', 'Thanks', 'alot', 'please', 'sorry'] },
              
              // 3: ASSIST - Chọn nghĩa tiếng Việt
              { type: 'ASSIST', question: 'What does "You\'re welcome" mean?', correctAnswer: 'Không có gì', options: [{ text: 'Không có gì', correct: true }, { text: 'Xin chào', correct: false }, { text: 'Tạm biệt', correct: false }, { text: 'Xin lỗi', correct: false }] },
              
              // 4: LISTEN - Nghe câu thứ 2
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'You are welcome', wordBank: ['You', 'are', 'welcome', 'Thanks', 'thank', 'sorry', 'welcome', 'hello'] },
              
              // 5: TYPE - Nhập cụm từ
              { type: 'TYPE', question: 'Type the polite word: _ _ _ _ _ _', correctAnswer: 'Please', options: [] },
              
              // 6: LISTEN - Nghe câu thứ 3
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'Excuse me please', wordBank: ['Excuse', 'me', 'please', 'you', 'sorry', 'thank', 'welcome', 'are'] },
              
              // 7: SELECT - Chọn cụm từ tiếp theo
              { type: 'SELECT', question: 'How do you accept thanks?', correctAnswer: null, options: [{ text: 'You\'re welcome', correct: true }, { text: 'Sorry', correct: false }, { text: 'No', correct: false }, { text: 'Go away', correct: false }] },
              
              // 8: LISTEN - Nghe câu thứ 4
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'I am sorry', wordBank: ['am', 'I', 'sorry', 'are', 'thank', 'you', 'welcome', 'please'] },
              
              // 9: ORDER - Sắp xếp từ
              { type: 'ORDER', question: 'Arrange: you / Thank / very / much', correctAnswer: null, wordBank: ['you', 'Thank', 'very', 'much'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // 10: LISTEN - Nghe câu thứ 5
              { type: 'LISTEN', question: 'Listen and write:', correctAnswer: 'No problem at all', wordBank: ['No', 'problem', 'at', 'all', 'all', 'thanks', 'please', 'sure'] },
              
              // 11: ASSIST - Chọn nghĩa tiếng Việt thứ 2
              { type: 'ASSIST', question: '"Xin lỗi" in English?', correctAnswer: 'Sorry', options: [{ text: 'Sorry', correct: true }, { text: 'Please', correct: false }, { text: 'Hello', correct: false }, { text: 'Goodbye', correct: false }] },
              
              // 12: TYPE - Nhập cụm từ thứ 2
              { type: 'TYPE', question: 'Type the phrase for thanks: _ _ _ _ _ _', correctAnswer: 'Thank you', options: [] },
              
              // 13: ORDER - Sắp xếp từ thứ 2
              { type: 'ORDER', question: 'Arrange: welcome / You / are / !', correctAnswer: null, wordBank: ['welcome', 'You', 'are', '!'], correctOrder: [1, 2, 0, 3], options: [] },
              
              // 14: MATCH - Nối cặp
              { type: 'MATCH', question: 'Match the phrases', correctAnswer: null, pairs: [{ left: 'Cảm ơn', right: 'Thank you' }, { left: 'Xin vui lòng', right: 'Please' }, { left: 'Xin lỗi', right: 'Sorry' }, { left: 'Không có gì', right: 'You\'re welcome' }], options: [] },
              
              // 15: COMPLETE - Hoàn thành câu
              { type: 'COMPLETE', question: 'Complete: ___ you very much.', correctAnswer: 'Thank', sentence: '___ you very much.', options: [] },
              
              // 16: COMPLETE - Hoàn thành câu thứ 2
              { type: 'COMPLETE', question: 'Complete: You ___ welcome.', correctAnswer: 'are', sentence: 'You ___ welcome.', options: [] },
              
              // 17: FILL - Chọn từ
              { type: 'FILL', question: 'Fill: ___ me, where is the bathroom?', correctAnswer: null, options: [{ text: 'Excuse', correct: true }, { text: 'Thank', correct: false }, { text: 'Sorry', correct: false }, { text: 'Welcome', correct: false }] },
              
              // 18: FILL - Chọn từ thứ 2
              { type: 'FILL', question: 'Fill: I am ___ for being late.', correctAnswer: null, options: [{ text: 'sorry', correct: true }, { text: 'welcome', correct: false }, { text: 'thankful', correct: false }, { text: 'please', correct: false }] },
            ],
          },
          {
            title: 'Questions',
            order: 1,
            challenges: [
              // SELECT - Chọn câu hỏi đúng (3 câu)
              { type: 'SELECT', question: `How do you ask someone's name?`, correctAnswer: null, options: [{ text: 'What is your name?', correct: true }, { text: 'How are you?', correct: false }, { text: 'Where are you?', correct: false }, { text: 'Who are you?', correct: false }] },
              { type: 'SELECT', question: 'Which is a question word?', correctAnswer: null, options: [{ text: 'Where', correct: true }, { text: 'The', correct: false }, { text: 'And', correct: false }, { text: 'But', correct: false }] },
              { type: 'SELECT', question: 'How do you ask about location?', correctAnswer: null, options: [{ text: 'Where is it?', correct: true }, { text: 'What is it?', correct: false }, { text: 'Who is it?', correct: false }, { text: 'When is it?', correct: false }] },
              
              // ASSIST - Chọn đáp án đúng (3 câu)
              { type: 'ASSIST', question: 'What does "Bạn khỏe không?" mean?', correctAnswer: 'How are you?', options: [{ text: 'How are you?', correct: true }, { text: 'What is your name?', correct: false }, { text: 'Where are you?', correct: false }, { text: 'How old are you?', correct: false }] },
              { type: 'ASSIST', question: '"Khi nào" in English?', correctAnswer: 'When', options: [{ text: 'When', correct: true }, { text: 'Where', correct: false }, { text: 'What', correct: false }, { text: 'Why', correct: false }] },
              { type: 'ASSIST', question: 'What does "How much" mean?', correctAnswer: 'Bao nhiêu', options: [{ text: 'Bao nhiêu', correct: true }, { text: 'Như thế nào', correct: false }, { text: 'Ở đâu', correct: false }, { text: 'Khi nào', correct: false }] },
              
              // TYPE - Nhập câu hỏi (3 câu)
              { type: 'TYPE', question: 'Ask "Bao nhiêu?": _ _ _', correctAnswer: 'How many', options: [] },
              { type: 'TYPE', question: 'Ask "Ở đâu?": _ _ _', correctAnswer: 'Where', options: [] },
              { type: 'TYPE', question: 'Ask "Như thế nào?": _ _ _', correctAnswer: 'How', options: [] },
              
              // TRANSLATE - Dịch câu hỏi (2 câu)
              { type: 'TRANSLATE', question: 'Type: "Bạn tên gì?"', correctAnswer: 'What is your name', options: [] },
              { type: 'TRANSLATE', question: 'Type: "Bạn đến từ đâu?"', correctAnswer: 'Where are you from', options: [] },
              
              // ORDER - Sắp xếp từ thành câu hỏi (2 câu)
              { type: 'ORDER', question: 'Arrange: your / What / name / is', correctAnswer: null, wordBank: ['your', 'What', 'name', 'is'], correctOrder: [1, 2, 3, 0], options: [] },
              { type: 'ORDER', question: 'Arrange: are / you / Where / from', correctAnswer: null, wordBank: ['are', 'you', 'Where', 'from'], correctOrder: [2, 1, 0, 3], options: [] },
              
              // MATCH - Nối cặp câu hỏi (2 câu)
              { type: 'MATCH', question: 'Match the question words', correctAnswer: null, pairs: [{ left: 'Ở đâu', right: 'Where' }, { left: 'Khi nào', right: 'When' }, { left: 'Bao nhiêu', right: 'How many' }, { left: 'Như thế nào', right: 'How' }], options: [] },
              { type: 'MATCH', question: 'Match questions', correctAnswer: null, pairs: [{ left: 'Tên gì?', right: 'What is your name?' }, { left: 'Đến từ đâu?', right: 'Where are you from?' }, { left: 'Khỏe không?', right: 'How are you?' }, { left: 'Bao nhiêu tuổi?', right: 'How old are you?' }], options: [] },
              
              // COMPLETE - Hoàn thành câu hỏi (2 câu)
              { type: 'COMPLETE', question: 'Complete: ___ is your name?', correctAnswer: 'What', sentence: '___ is your name?', options: [] },
              { type: 'COMPLETE', question: 'Complete: ___ are you from?', correctAnswer: 'Where', sentence: '___ are you from?', options: [] },
              
              // FILL - Chọn từ điền vào chỗ trống (2 câu)
              { type: 'FILL', question: 'Fill: ___ is your phone number?', correctAnswer: null, options: [{ text: 'What', correct: true }, { text: 'Where', correct: false }, { text: 'When', correct: false }, { text: 'Who', correct: false }] },
              { type: 'FILL', question: 'Fill: ___ are you doing?', correctAnswer: null, options: [{ text: 'How', correct: true }, { text: 'What', correct: false }, { text: 'Where', correct: false }, { text: 'When', correct: false }] },
            ],
          },
          {
            title: 'Possessives',
            order: 2,
            challenges: [
              // SELECT - Chọn từ sở hữu đúng (3 câu)
              { type: 'SELECT', question: 'How do you say "của tôi"?', correctAnswer: null, options: [{ text: 'My', correct: true }, { text: 'Your', correct: false }, { text: 'His', correct: false }, { text: 'Her', correct: false }] },
              { type: 'SELECT', question: 'Which is a possessive?', correctAnswer: null, options: [{ text: 'Our', correct: true }, { text: 'Are', correct: false }, { text: 'Have', correct: false }, { text: 'Going', correct: false }] },
              { type: 'SELECT', question: 'What means "belongs to him"?', correctAnswer: null, options: [{ text: 'His', correct: true }, { text: 'Her', correct: false }, { text: 'My', correct: false }, { text: 'Our', correct: false }] },
              
              // ASSIST - Chọn đáp án đúng (3 câu)
              { type: 'ASSIST', question: 'What does "yours" mean?', correctAnswer: 'của bạn', options: [{ text: 'của bạn', correct: true }, { text: 'của tôi', correct: false }, { text: 'của anh ấy', correct: false }, { text: 'của cô ấy', correct: false }] },
              { type: 'ASSIST', question: '"của họ" in English?', correctAnswer: 'Their', options: [{ text: 'Their', correct: true }, { text: 'Our', correct: false }, { text: 'Your', correct: false }, { text: 'My', correct: false }] },
              { type: 'ASSIST', question: 'What does "Her" mean?', correctAnswer: 'của cô ấy', options: [{ text: 'của cô ấy', correct: true }, { text: 'của anh ấy', correct: false }, { text: 'của bạn', correct: false }, { text: 'của tôi', correct: false }] },
              
              // TYPE - Nhập từ sở hữu (3 câu)
              { type: 'TYPE', question: 'Complete: This is _ book.', correctAnswer: 'my', options: [] },
              { type: 'TYPE', question: 'Complete: That is _ house.', correctAnswer: 'his', options: [] },
              { type: 'TYPE', question: 'Complete: These are _ pens.', correctAnswer: 'her', options: [] },
              
              // TRANSLATE - Dịch câu (2 câu)
              { type: 'TRANSLATE', question: 'Type: "Đây là sách của tôi"', correctAnswer: 'This is my book', options: [] },
              { type: 'TRANSLATE', question: 'Type: "Đó là nhà của cô ấy"', correctAnswer: 'That is her house', options: [] },
              
              // ORDER - Sắp xếp từ (2 câu)
              { type: 'ORDER', question: 'Arrange: is / This / my / bag', correctAnswer: null, wordBank: ['is', 'This', 'my', 'bag'], correctOrder: [1, 0, 2, 3], options: [] },
              { type: 'ORDER', question: 'Arrange: are / Those / our / books', correctAnswer: null, wordBank: ['are', 'Those', 'our', 'books'], correctOrder: [1, 0, 2, 3], options: [] },
              
              // MATCH - Nối cặp (2 câu)
              { type: 'MATCH', question: 'Match the possessives', correctAnswer: null, pairs: [{ left: 'của tôi', right: 'My' }, { left: 'của bạn', right: 'Your' }, { left: 'của anh ấy', right: 'His' }, { left: 'của cô ấy', right: 'Her' }], options: [] },
              { type: 'MATCH', question: 'Match English to Vietnamese', correctAnswer: null, pairs: [{ left: 'Our', right: 'của chúng tôi' }, { left: 'Their', right: 'của họ' }, { left: 'Mine', right: 'của tôi' }, { left: 'Yours', right: 'của bạn' }], options: [] },
              
              // COMPLETE - Hoàn thành câu (2 câu)
              { type: 'COMPLETE', question: 'Complete: _ name is John.', correctAnswer: 'My', sentence: '_ name is John.', options: [] },
              { type: 'COMPLETE', question: 'Complete: Is this _ bag?', correctAnswer: 'your', sentence: 'Is this _ bag?', options: [] },
              
              // FILL - Chọn từ (2 câu)
              { type: 'FILL', question: 'Fill: ___ house is big.', correctAnswer: null, options: [{ text: 'Their', correct: true }, { text: 'My', correct: false }, { text: 'I', correct: false }, { text: 'Me', correct: false }] },
              { type: 'FILL', question: 'Fill: ___ family is happy.', correctAnswer: null, options: [{ text: 'Our', correct: true }, { text: 'We', correct: false }, { text: 'Us', correct: false }, { text: 'Ours', correct: false }] },
            ],
          },
          {
            title: 'This & That',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'How do you say "này" in English?', correctAnswer: null, options: [{ text: 'This', correct: true }, { text: 'That', correct: false }, { text: 'These', correct: false }, { text: 'Those', correct: false }] },
              { type: 'ASSIST', question: 'What does "that one" mean?', correctAnswer: 'cái đó', options: [{ text: 'cái đó', correct: true }, { text: 'cái này', correct: false }, { text: 'những cái này', correct: false }, { text: 'những cái đó', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ is my book. (singular near)', correctAnswer: 'This', options: [] },
              { type: 'SELECT', question: 'Which is plural near?', correctAnswer: null, options: [{ text: 'These', correct: true }, { text: 'This', correct: false }, { text: 'That', correct: false }, { text: 'Those', correct: false }] },
              { type: 'ASSIST', question: '"Những cái đó" in English?', correctAnswer: 'Those', options: [{ text: 'Those', correct: true }, { text: 'These', correct: false }, { text: 'That', correct: false }, { text: 'This', correct: false }] },
            ],
          },
          {
            title: 'Basic Verbs',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "ăn" in English?', correctAnswer: null, options: [{ text: 'Eat', correct: true }, { text: 'Drink', correct: false }, { text: 'Run', correct: false }, { text: 'Walk', correct: false }] },
              { type: 'ASSIST', question: 'What does "uống" mean?', correctAnswer: 'Drink', options: [{ text: 'Drink', correct: true }, { text: 'Eat', correct: false }, { text: 'Cook', correct: false }, { text: 'Buy', correct: false }] },
              { type: 'TYPE', question: 'Complete: I _ to school every day.', correctAnswer: 'go', options: [] },
              { type: 'SELECT', question: 'Which is a movement verb?', correctAnswer: null, options: [{ text: 'Walk', correct: true }, { text: 'Sleep', correct: false }, { text: 'Think', correct: false }, { text: 'Know', correct: false }] },
              { type: 'ASSIST', question: '"Nhìn" in English?', correctAnswer: 'Look', options: [{ text: 'Look', correct: true }, { text: 'See', correct: false }, { text: 'Watch', correct: false }, { text: 'Hear', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Practice',
        description: 'Practice what you learned',
        order: 2,
        lessons: [
          {
            title: 'Review: Words',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is the opposite of "man"?', correctAnswer: null, options: [{ text: 'Woman', correct: true }, { text: 'Boy', correct: false }, { text: 'Girl', correct: false }, { text: 'Child', correct: false }] },
              { type: 'ASSIST', question: 'What does "ngày" mean?', correctAnswer: 'Day', options: [{ text: 'Day', correct: true }, { text: 'Night', correct: false }, { text: 'Morning', correct: false }, { text: 'Evening', correct: false }] },
              { type: 'TYPE', question: 'Type the time of sleep: _ _ _ _', correctAnswer: 'Night', options: [] },
              { type: 'SELECT', question: 'Which is an animal?', correctAnswer: null, options: [{ text: 'Dog', correct: true }, { text: 'Table', correct: false }, { text: 'Chair', correct: false }, { text: 'Door', correct: false }] },
              { type: 'ASSIST', question: '"Con chim" in English?', correctAnswer: 'Bird', options: [{ text: 'Bird', correct: true }, { text: 'Fish', correct: false }, { text: 'Cat', correct: false }, { text: 'Dog', correct: false }] },
            ],
          },
          {
            title: 'Review: Phrases',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'How do you start a phone call?', correctAnswer: null, options: [{ text: 'Hello?', correct: true }, { text: 'Goodbye', correct: false }, { text: 'Please', correct: false }, { text: 'Sorry', correct: false }] },
              { type: 'ASSIST', question: 'What does "I understand" mean?', correctAnswer: 'Tôi hiểu', options: [{ text: 'Tôi hiểu', correct: true }, { text: 'Tôi không biết', correct: false }, { text: 'Tôi muốn', correct: false }, { text: 'Tôi cần', correct: false }] },
              { type: 'TYPE', question: 'Complete: Nice to _ you.', correctAnswer: 'meet', options: [] },
              { type: 'SELECT', question: 'Which means "Dạ"?', correctAnswer: null, options: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }, { text: 'Maybe', correct: false }, { text: 'Please', correct: false }] },
              { type: 'ASSIST', question: '"Không" in English?', correctAnswer: 'No', options: [{ text: 'No', correct: true }, { text: 'Not', correct: false }, { text: 'Nothing', correct: false }, { text: 'Never', correct: false }] },
            ],
          },
          {
            title: 'Mini Quiz 1',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "tôi yêu bạn"?', correctAnswer: null, options: [{ text: 'I love you', correct: true }, { text: 'I like you', correct: false }, { text: 'I miss you', correct: false }, { text: 'I need you', correct: false }] },
              { type: 'ASSIST', question: 'What does "good morning" mean?', correctAnswer: 'Chào buổi sáng', options: [{ text: 'Chào buổi sáng', correct: true }, { text: 'Chào buổi trưa', correct: false }, { text: 'Chào buổi chiều', correct: false }, { text: 'Chào buổi tối', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ night. (greeting)', correctAnswer: 'Good', options: [] },
              { type: 'SELECT', question: 'Which is a verb?', correctAnswer: null, options: [{ text: 'Think', correct: true }, { text: 'Happy', correct: false }, { text: 'Beautiful', correct: false }, { text: 'Blue', correct: false }] },
              { type: 'ASSIST', question: '"Học" in English?', correctAnswer: 'Study', options: [{ text: 'Study', correct: true }, { text: 'Learn', correct: false }, { text: 'Teach', correct: false }, { text: 'Read', correct: false }] },
            ],
          },
          {
            title: 'Mini Quiz 2',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'How do you say "ở đâu"?', correctAnswer: null, options: [{ text: 'Where', correct: true }, { text: 'When', correct: false }, { text: 'What', correct: false }, { text: 'Why', correct: false }] },
              { type: 'ASSIST', question: 'What does "because" mean?', correctAnswer: 'Bởi vì', options: [{ text: 'Bởi vì', correct: true }, { text: 'Nhưng', correct: false }, { text: 'Và', correct: false }, { text: 'Hoặc', correct: false }] },
              { type: 'TYPE', question: 'Complete: I _ a student.', correctAnswer: 'am', options: [] },
              { type: 'SELECT', question: 'Which is a preposition?', correctAnswer: null, options: [{ text: 'In', correct: true }, { text: 'The', correct: false }, { text: 'And', correct: false }, { text: 'But', correct: false }] },
              { type: 'ASSIST', question: '"Trên" in English?', correctAnswer: 'On', options: [{ text: 'On', correct: true }, { text: 'In', correct: false }, { text: 'At', correct: false }, { text: 'Under', correct: false }] },
            ],
          },
          {
            title: 'Basics Test',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "không sao"?', correctAnswer: null, options: [{ text: 'No problem', correct: true }, { text: 'No thanks', correct: false }, { text: 'No way', correct: false }, { text: 'No more', correct: false }] },
              { type: 'ASSIST', question: 'What does "congratulations" mean?', correctAnswer: 'Chúc mừng', options: [{ text: 'Chúc mừng', correct: true }, { text: 'Xin lỗi', correct: false }, { text: 'Chào mừng', correct: false }, { text: 'Khen ngợi', correct: false }] },
              { type: 'TYPE', question: 'Complete: Good _!', correctAnswer: 'luck', options: [] },
              { type: 'SELECT', question: 'Which is an emotion?', correctAnswer: null, options: [{ text: 'Happy', correct: true }, { text: 'House', correct: false }, { text: 'Water', correct: false }, { text: 'School', correct: false }] },
              { type: 'ASSIST', question: '"Buồn" in English?', correctAnswer: 'Sad', options: [{ text: 'Sad', correct: true }, { text: 'Happy', correct: false }, { text: 'Angry', correct: false }, { text: 'Tired', correct: false }] },
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // COURSE 2: FOOD & DRINK - Intermediate English
  // ============================================================
  {
    course: {
      slug: 'food-drink',
      title: 'Food & Drink',
      description: 'Learn vocabulary for food, drinks, and dining out in English.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'beginner',
      order: 1,
      isPublished: true,
      thumbnailUrl: 'https://cdn.duolingo.com/image/food.png',
      imageSrc: 'https://cdn.duolingo.com/image/food.png',
      language: 'en',
      difficulty: 'beginner',
      isActive: true,
    },
    units: [
      {
        title: 'Fruits & Vegetables',
        description: 'Learn names of fruits and vegetables',
        order: 0,
        lessons: [
          {
            title: 'Common Fruits',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "quả cam"?', correctAnswer: null, options: [{ text: 'Orange', correct: true }, { text: 'Apple', correct: false }, { text: 'Lemon', correct: false }, { text: 'Banana', correct: false }] },
              { type: 'ASSIST', question: 'What does "banana" mean?', correctAnswer: 'Quả chuối', options: [{ text: 'Quả chuối', correct: true }, { text: 'Quả táo', correct: false }, { text: 'Quả cam', correct: false }, { text: 'Quả nho', correct: false }] },
              { type: 'TYPE', question: 'Type the fruit: _ _ _ _ _', correctAnswer: 'Apple', options: [] },
              { type: 'SELECT', question: 'Which is a tropical fruit?', correctAnswer: null, options: [{ text: 'Mango', correct: true }, { text: 'Apple', correct: false }, { text: 'Orange', correct: false }, { text: 'Grape', correct: false }] },
              { type: 'ASSIST', question: '"Dâu tây" in English?', correctAnswer: 'Strawberry', options: [{ text: 'Strawberry', correct: true }, { text: 'Blueberry', correct: false }, { text: 'Raspberry', correct: false }, { text: 'Cherry', correct: false }] },
            ],
          },
          {
            title: 'Common Vegetables',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "cà rốt"?', correctAnswer: null, options: [{ text: 'Carrot', correct: true }, { text: 'Potato', correct: false }, { text: 'Tomato', correct: false }, { text: 'Onion', correct: false }] },
              { type: 'ASSIST', question: 'What does "broccoli" mean?', correctAnswer: 'Bông cải xanh', options: [{ text: 'Bông cải xanh', correct: true }, { text: 'Cà rốt', correct: false }, { text: 'Đậu xanh', correct: false }, { text: 'Rau bina', correct: false }] },
              { type: 'TYPE', question: 'Type the vegetable: _ _ _ _ _ _ _', correctAnswer: 'Cabbage', options: [] },
              { type: 'SELECT', question: 'Which is a root vegetable?', correctAnswer: null, options: [{ text: 'Potato', correct: true }, { text: 'Lettuce', correct: false }, { text: 'Celery', correct: false }, { text: 'Spinach', correct: false }] },
              { type: 'ASSIST', question: '"Hành tây" in English?', correctAnswer: 'Onion', options: [{ text: 'Onion', correct: true }, { text: 'Garlic', correct: false }, { text: 'Leek', correct: false }, { text: 'Shallot', correct: false }] },
            ],
          },
          {
            title: 'At the Market',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "mua" in English?', correctAnswer: null, options: [{ text: 'Buy', correct: true }, { text: 'Sell', correct: false }, { text: 'Give', correct: false }, { text: 'Take', correct: false }] },
              { type: 'ASSIST', question: 'What does "fresh" mean?', correctAnswer: 'Tươi', options: [{ text: 'Tươi', correct: true }, { text: 'Héo', correct: false }, { text: 'Nấu chín', correct: false }, { text: 'Sống', correct: false }] },
              { type: 'TYPE', question: 'Complete: I want to _ some apples.', correctAnswer: 'buy', options: [] },
              { type: 'SELECT', question: 'Which word means "giá"?', correctAnswer: null, options: [{ text: 'Price', correct: true }, { text: 'Weight', correct: false }, { text: 'Quality', correct: false }, { text: 'Size', correct: false }] },
              { type: 'ASSIST', question: '"Rẻ" in English?', correctAnswer: 'Cheap', options: [{ text: 'Cheap', correct: true }, { text: 'Expensive', correct: false }, { text: 'Free', correct: false }, { text: 'Costly', correct: false }] },
            ],
          },
          {
            title: 'Cooking Terms',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "nấu"?', correctAnswer: null, options: [{ text: 'Cook', correct: true }, { text: 'Bake', correct: false }, { text: 'Fry', correct: false }, { text: 'Boil', correct: false }] },
              { type: 'ASSIST', question: 'What does "slice" mean?', correctAnswer: 'Cắt lát', options: [{ text: 'Cắt lát', correct: true }, { text: 'Xắt nhỏ', correct: false }, { text: 'Băm', correct: false }, { text: 'Nặn', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please _ the vegetables.', correctAnswer: 'chop', options: [] },
              { type: 'SELECT', question: 'Which is a cooking method?', correctAnswer: null, options: [{ text: 'Grill', correct: true }, { text: 'Table', correct: false }, { text: 'Kitchen', correct: false }, { text: 'Plate', correct: false }] },
              { type: 'ASSIST', question: '"Chiên" in English?', correctAnswer: 'Fry', options: [{ text: 'Fry', correct: true }, { text: 'Boil', correct: false }, { text: 'Steam', correct: false }, { text: 'Roast', correct: false }] },
            ],
          },
          {
            title: 'Food Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "ngon"?', correctAnswer: null, options: [{ text: 'Delicious', correct: true }, { text: 'Spicy', correct: false }, { text: 'Salty', correct: false }, { text: 'Sour', correct: false }] },
              { type: 'ASSIST', question: 'What does "sweet" mean?', correctAnswer: 'Ngọt', options: [{ text: 'Ngọt', correct: true }, { text: 'Mặn', correct: false }, { text: 'Chua', correct: false }, { text: 'Đắng', correct: false }] },
              { type: 'TYPE', question: 'Complete: This food is very _.', correctAnswer: 'tasty', options: [] },
              { type: 'SELECT', question: 'Which means "ít"?', correctAnswer: null, options: [{ text: 'Little', correct: true }, { text: 'Much', correct: false }, { text: 'Many', correct: false }, { text: 'Lot', correct: false }] },
              { type: 'ASSIST', question: '" cay" in English?', correctAnswer: 'Spicy', options: [{ text: 'Spicy', correct: true }, { text: 'Hot', correct: false }, { text: 'Warm', correct: false }, { text: 'Cold', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Drinks & Beverages',
        description: 'Learn names of drinks and how to order them',
        order: 1,
        lessons: [
          {
            title: 'Hot Drinks',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "cà phê"?', correctAnswer: null, options: [{ text: 'Coffee', correct: true }, { text: 'Tea', correct: false }, { text: 'Milk', correct: false }, { text: 'Juice', correct: false }] },
              { type: 'ASSIST', question: 'What does "tea" mean?', correctAnswer: 'Trà', options: [{ text: 'Trà', correct: true }, { text: 'Cà phê', correct: false }, { text: 'Sữa', correct: false }, { text: 'Nước', correct: false }] },
              { type: 'TYPE', question: 'Type the drink: _ _ _ _ _ _ _ _ _', correctAnswer: 'Hot chocolate', options: [] },
              { type: 'SELECT', question: 'Which is a hot drink?', correctAnswer: null, options: [{ text: 'Coffee', correct: true }, { text: 'Iced tea', correct: false }, { text: 'Soda', correct: false }, { text: 'Smoothie', correct: false }] },
              { type: 'ASSIST', question: '"Sữa nóng" in English?', correctAnswer: 'Hot milk', options: [{ text: 'Hot milk', correct: true }, { text: 'Warm milk', correct: false }, { text: 'Cold milk', correct: false }, { text: 'Boiled milk', correct: false }] },
            ],
          },
          {
            title: 'Cold Drinks',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "nước ép"?', correctAnswer: null, options: [{ text: 'Juice', correct: true }, { text: 'Water', correct: false }, { text: 'Soda', correct: false }, { text: 'Milk', correct: false }] },
              { type: 'ASSIST', question: 'What does "soda" mean?', correctAnswer: 'Nước ngọt', options: [{ text: 'Nước ngọt', correct: true }, { text: 'Nước ép', correct: false }, { text: 'Nước lọc', correct: false }, { text: 'Trà đá', correct: false }] },
              { type: 'TYPE', question: 'Complete: I would like some _.', correctAnswer: 'water', options: [] },
              { type: 'SELECT', question: 'Which is a cold drink?', correctAnswer: null, options: [{ text: 'Smoothie', correct: true }, { text: 'Coffee', correct: false }, { text: 'Tea', correct: false }, { text: 'Cocoa', correct: false }] },
              { type: 'ASSIST', question: '"Nước dừa" in English?', correctAnswer: 'Coconut water', options: [{ text: 'Coconut water', correct: true }, { text: 'Orange juice', correct: false }, { text: 'Apple juice', correct: false }, { text: 'Lemonade', correct: false }] },
            ],
          },
          {
            title: 'At the Café',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "bàn"?', correctAnswer: null, options: [{ text: 'Table', correct: true }, { text: 'Chair', correct: false }, { text: 'Menu', correct: false }, { text: 'Bill', correct: false }] },
              { type: 'ASSIST', question: 'What does "menu" mean?', correctAnswer: 'Thực đơn', options: [{ text: 'Thực đơn', correct: true }, { text: 'Hóa đơn', correct: false }, { text: 'Bàn', correct: false }, { text: 'Ghế', correct: false }] },
              { type: 'TYPE', question: 'Complete: Can I have the _, please?', correctAnswer: 'bill', options: [] },
              { type: 'SELECT', question: 'Which means "đặt"?', correctAnswer: null, options: [{ text: 'Order', correct: true }, { text: 'Book', correct: false }, { text: 'Pay', correct: false }, { text: 'Leave', correct: false }] },
              { type: 'ASSIST', question: '"Món tráng miệng" in English?', correctAnswer: 'Dessert', options: [{ text: 'Dessert', correct: true }, { text: 'Appetizer', correct: false }, { text: 'Main course', correct: false }, { text: 'Starter', correct: false }] },
            ],
          },
          {
            title: 'Restaurant Orders',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'How do you say "tôi muốn"?', correctAnswer: null, options: [{ text: 'I would like', correct: true }, { text: 'I want', correct: false }, { text: 'I need', correct: false }, { text: 'I have', correct: false }] },
              { type: 'ASSIST', question: 'What does "delicious" mean?', correctAnswer: 'Ngon', options: [{ text: 'Ngon', correct: true }, { text: 'Ngọt', correct: false }, { text: 'Mặn', correct: false }, { text: 'Chua', correct: false }] },
              { type: 'TYPE', question: 'Complete: The food is _.', correctAnswer: 'delicious', options: [] },
              { type: 'SELECT', question: 'Which means "hết"?', correctAnswer: null, options: [{ text: 'All gone', correct: true }, { text: 'Full', correct: false }, { text: 'Empty', correct: false }, { text: 'Done', correct: false }] },
              { type: 'ASSIST', question: '"Còn gì nữa không?" in English?', correctAnswer: 'Anything else?', options: [{ text: 'Anything else?', correct: true }, { text: 'What is this?', correct: false }, { text: 'How much?', correct: false }, { text: 'Where is?', correct: false }] },
            ],
          },
          {
            title: 'Drinks Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "khát"?', correctAnswer: null, options: [{ text: 'Thirsty', correct: true }, { text: 'Hungry', correct: false }, { text: 'Sleepy', correct: false }, { text: 'Tired', correct: false }] },
              { type: 'ASSIST', question: 'What does "full" mean?', correctAnswer: 'No', options: [{ text: 'No', correct: true }, { text: 'Đói', correct: false }, { text: 'Khát', correct: false }, { text: 'Mệt', correct: false }] },
              { type: 'TYPE', question: 'Complete: I am very _.', correctAnswer: 'thirsty', options: [] },
              { type: 'SELECT', question: 'Which is an alcoholic drink?', correctAnswer: null, options: [{ text: 'Wine', correct: true }, { text: 'Juice', correct: false }, { text: 'Water', correct: false }, { text: 'Milk', correct: false }] },
              { type: 'ASSIST', question: '"Bia" in English?', correctAnswer: 'Beer', options: [{ text: 'Beer', correct: true }, { text: 'Wine', correct: false }, { text: 'Whisky', correct: false }, { text: 'Vodka', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Meals & Dining',
        description: 'Learn about meals and dining customs',
        order: 2,
        lessons: [
          {
            title: 'Meal Times',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "bữa sáng"?', correctAnswer: null, options: [{ text: 'Breakfast', correct: true }, { text: 'Lunch', correct: false }, { text: 'Dinner', correct: false }, { text: 'Snack', correct: false }] },
              { type: 'ASSIST', question: 'What does "dinner" mean?', correctAnswer: 'Bữa tối', options: [{ text: 'Bữa tối', correct: true }, { text: 'Bữa trưa', correct: false }, { text: 'Bữa sáng', correct: false }, { text: 'Bữa phụ', correct: false }] },
              { type: 'TYPE', question: 'Complete: I have _ at noon.', correctAnswer: 'lunch', options: [] },
              { type: 'SELECT', question: 'Which is an evening meal?', correctAnswer: null, options: [{ text: 'Dinner', correct: true }, { text: 'Breakfast', correct: false }, { text: 'Brunch', correct: false }, { text: 'Snack', correct: false }] },
              { type: 'ASSIST', question: '"Bữa trưa" in English?', correctAnswer: 'Lunch', options: [{ text: 'Lunch', correct: true }, { text: 'Dinner', correct: false }, { text: 'Breakfast', correct: false }, { text: 'Supper', correct: false }] },
            ],
          },
          {
            title: 'Table Setting',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "đĩa"?', correctAnswer: null, options: [{ text: 'Plate', correct: true }, { text: 'Bowl', correct: false }, { text: 'Cup', correct: false }, { text: 'Glass', correct: false }] },
              { type: 'ASSIST', question: 'What does "fork" mean?', correctAnswer: 'Nĩa', options: [{ text: 'Nĩa', correct: true }, { text: 'Dao', correct: false }, { text: 'Thìa', correct: false }, { text: 'Chopsticks', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please pass me a _.', correctAnswer: 'spoon', options: [] },
              { type: 'SELECT', question: 'Which is used for cutting?', correctAnswer: null, options: [{ text: 'Knife', correct: true }, { text: 'Fork', correct: false }, { text: 'Spoon', correct: false }, { text: 'Plate', correct: false }] },
              { type: 'ASSIST', question: '"Ly" in English?', correctAnswer: 'Glass', options: [{ text: 'Glass', correct: true }, { text: 'Cup', correct: false }, { text: 'Mug', correct: false }, { text: 'Bowl', correct: false }] },
            ],
          },
          {
            title: 'Eating Out',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "món ăn"?', correctAnswer: null, options: [{ text: 'Dish', correct: true }, { text: 'Menu', correct: false }, { text: 'Course', correct: false }, { text: 'Meal', correct: false }] },
              { type: 'ASSIST', question: 'What does "tip" mean?', correctAnswer: 'Tiền boa', options: [{ text: 'Tiền boa', correct: true }, { text: 'Hóa đơn', correct: false }, { text: 'Giảm giá', correct: false }, { text: 'Phí', correct: false }] },
              { type: 'TYPE', question: 'Complete: Can I have the _, please?', correctAnswer: 'check', options: [] },
              { type: 'SELECT', question: 'Which means "miễn phí"?', correctAnswer: null, options: [{ text: 'Free', correct: true }, { text: 'Price', correct: false }, { text: 'Cost', correct: false }, { text: 'Pay', correct: false }] },
              { type: 'ASSIST', question: '"Khoảng" in English?', correctAnswer: 'About', options: [{ text: 'About', correct: true }, { text: 'Exactly', correct: false }, { text: 'Around', correct: false }, { text: 'Between', correct: false }] },
            ],
          },
          {
            title: 'Food Vocabulary',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "thịt"?', correctAnswer: null, options: [{ text: 'Meat', correct: true }, { text: 'Fish', correct: false }, { text: 'Chicken', correct: false }, { text: 'Beef', correct: false }] },
              { type: 'ASSIST', question: 'What does "rice" mean?', correctAnswer: 'Gạo / Cơm', options: [{ text: 'Gạo / Cơm', correct: true }, { text: 'Bánh mì', correct: false }, { text: 'Mì', correct: false }, { text: 'Bún', correct: false }] },
              { type: 'TYPE', question: 'Complete: I eat _ every day.', correctAnswer: 'rice', options: [] },
              { type: 'SELECT', question: 'Which is seafood?', correctAnswer: null, options: [{ text: 'Shrimp', correct: true }, { text: 'Chicken', correct: false }, { text: 'Beef', correct: false }, { text: 'Pork', correct: false }] },
              { type: 'ASSIST', question: '"Cá" in English?', correctAnswer: 'Fish', options: [{ text: 'Fish', correct: true }, { text: 'Shrimp', correct: false }, { text: 'Crab', correct: false }, { text: 'Lobster', correct: false }] },
            ],
          },
          {
            title: 'Food & Drink Test',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "ngọt"?', correctAnswer: null, options: [{ text: 'Sweet', correct: true }, { text: 'Salty', correct: false }, { text: 'Bitter', correct: false }, { text: 'Sour', correct: false }] },
              { type: 'ASSIST', question: 'What does "spicy" mean?', correctAnswer: 'Cay', options: [{ text: 'Cay', correct: true }, { text: 'Mặn', correct: false }, { text: 'Ngọt', correct: false }, { text: 'Đắng', correct: false }] },
              { type: 'TYPE', question: 'Complete: This soup is _.', correctAnswer: 'delicious', options: [] },
              { type: 'SELECT', question: 'Which is NOT a drink?', correctAnswer: null, options: [{ text: 'Bread', correct: true }, { text: 'Tea', correct: false }, { text: 'Coffee', correct: false }, { text: 'Water', correct: false }] },
              { type: 'ASSIST', question: '"Bữa ăn" in English?', correctAnswer: 'Meal', options: [{ text: 'Meal', correct: true }, { text: 'Food', correct: false }, { text: 'Dish', correct: false }, { text: 'Menu', correct: false }] },
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // COURSE 3: TRAVEL - Intermediate English
  // ============================================================
  {
    course: {
      slug: 'travel',
      title: 'Travel',
      description: 'Essential English for traveling, airports, hotels, and transportation.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'intermediate',
      order: 2,
      isPublished: true,
      thumbnailUrl: 'https://cdn.duolingo.com/image/travel.png',
      imageSrc: 'https://cdn.duolingo.com/image/travel.png',
      language: 'en',
      difficulty: 'intermediate',
      isActive: true,
    },
    units: [
      {
        title: 'At the Airport',
        description: 'Navigate airports with confidence',
        order: 0,
        lessons: [
          {
            title: 'Airport Check-in',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "sân bay"?', correctAnswer: null, options: [{ text: 'Airport', correct: true }, { text: 'Station', correct: false }, { text: 'Port', correct: false }, { text: 'Terminal', correct: false }] },
              { type: 'ASSIST', question: 'What does "passport" mean?', correctAnswer: 'Hộ chiếu', options: [{ text: 'Hộ chiếu', correct: true }, { text: 'Visa', correct: false }, { text: 'Ticket', correct: false }, { text: 'ID card', correct: false }] },
              { type: 'TYPE', question: 'Complete: Where is the _ desk?', correctAnswer: 'check-in', options: [] },
              { type: 'SELECT', question: 'Which is needed to fly?', correctAnswer: null, options: [{ text: 'Ticket', correct: true }, { text: 'Menu', correct: false }, { text: 'Receipt', correct: false }, { text: 'Bill', correct: false }] },
              { type: 'ASSIST', question: '"Vé máy bay" in English?', correctAnswer: 'Flight ticket', options: [{ text: 'Flight ticket', correct: true }, { text: 'Train ticket', correct: false }, { text: 'Bus ticket', correct: false }, { text: 'Boat ticket', correct: false }] },
            ],
          },
          {
            title: 'Security & Boarding',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "an ninh"?', correctAnswer: null, options: [{ text: 'Security', correct: true }, { text: 'Customs', correct: false }, { text: 'Immigration', correct: false }, { text: 'Border', correct: false }] },
              { type: 'ASSIST', question: 'What does "boarding pass" mean?', correctAnswer: 'Thẻ lên máy bay', options: [{ text: 'Thẻ lên máy bay', correct: true }, { text: 'Vé máy bay', correct: false }, { text: 'Hộ chiếu', correct: false }, { text: 'Thẻ baggage', correct: false }] },
              { type: 'TYPE', question: 'Complete: We are now _.', correctAnswer: 'boarding', options: [] },
              { type: 'SELECT', question: 'Which is a gate number?', correctAnswer: null, options: [{ text: 'A12', correct: true }, { text: 'A1234', correct: false }, { text: 'A1B2C3', correct: false }, { text: 'First', correct: false }] },
              { type: 'ASSIST', question: '"Cổng" in English?', correctAnswer: 'Gate', options: [{ text: 'Gate', correct: true }, { text: 'Door', correct: false }, { text: 'Entrance', correct: false }, { text: 'Exit', correct: false }] },
            ],
          },
          {
            title: 'Luggage',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'What is "hành lý"?', correctAnswer: null, options: [{ text: 'Luggage', correct: true }, { text: 'Package', correct: false }, { text: 'Bag', correct: false }, { text: 'Box', correct: false }] },
              { type: 'ASSIST', question: 'What does "suitcase" mean?', correctAnswer: 'Vali', options: [{ text: 'Vali', correct: true }, { text: 'Túi xách', correct: false }, { text: 'Ba lô', correct: false }, { text: 'Túi đeo', correct: false }] },
              { type: 'TYPE', question: 'Complete: My _ is lost.', correctAnswer: 'luggage', options: [] },
              { type: 'SELECT', question: 'Which is checked baggage?', correctAnswer: null, options: [{ text: 'Hold luggage', correct: true }, { text: 'Hand luggage', correct: false }, { text: 'Backpack', correct: false }, { text: 'Purse', correct: false }] },
              { type: 'ASSIST', question: '"Hành lý xách tay" in English?', correctAnswer: 'Hand luggage', options: [{ text: 'Hand luggage', correct: true }, { text: 'Hold luggage', correct: false }, { text: 'Cargo', correct: false }, { text: 'Checked bag', correct: false }] },
            ],
          },
          {
            title: 'Flight Information',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "chuyến bay"?', correctAnswer: null, options: [{ text: 'Flight', correct: true }, { text: 'Trip', correct: false }, { text: 'Journey', correct: false }, { text: 'Route', correct: false }] },
              { type: 'ASSIST', question: 'What does "delay" mean?', correctAnswer: 'Trễ', options: [{ text: 'Trễ', correct: true }, { text: 'Sớm', correct: false }, { text: 'Đúng giờ', correct: false }, { text: 'Hủy', correct: false }] },
              { type: 'TYPE', question: 'Complete: The flight is _.', correctAnswer: 'delayed', options: [] },
              { type: 'SELECT', question: 'Which is a flight status?', correctAnswer: null, options: [{ text: 'Cancelled', correct: true }, { text: 'Airport', correct: false }, { text: 'Gate', correct: false }, { text: 'Ticket', correct: false }] },
              { type: 'ASSIST', question: '"Bị hủy" in English?', correctAnswer: 'Cancelled', options: [{ text: 'Cancelled', correct: true }, { text: 'Delayed', correct: false }, { text: 'Boarded', correct: false }, { text: 'Arrived', correct: false }] },
            ],
          },
          {
            title: 'Airport Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "khởi hành"?', correctAnswer: null, options: [{ text: 'Depart', correct: true }, { text: 'Arrive', correct: false }, { text: 'Land', correct: false }, { text: 'Take off', correct: false }] },
              { type: 'ASSIST', question: 'What does "arrive" mean?', correctAnswer: 'Đến', options: [{ text: 'Đến', correct: true }, { text: 'Đi', correct: false }, { text: 'Khởi hành', correct: false }, { text: 'Bay', correct: false }] },
              { type: 'TYPE', question: 'Complete: When does the flight _?', correctAnswer: 'depart', options: [] },
              { type: 'SELECT', question: 'Which is a time-related word?', correctAnswer: null, options: [{ text: 'Departure', correct: true }, { text: 'Gate', correct: false }, { text: 'Terminal', correct: false }, { text: 'Runway', correct: false }] },
              { type: 'ASSIST', question: '"Điểm đến" in English?', correctAnswer: 'Destination', options: [{ text: 'Destination', correct: true }, { text: 'Origin', correct: false }, { text: 'Stopover', correct: false }, { text: 'Transit', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Hotels & Accommodation',
        description: 'Book and stay in hotels',
        order: 1,
        lessons: [
          {
            title: 'Booking a Hotel',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "khách sạn"?', correctAnswer: null, options: [{ text: 'Hotel', correct: true }, { text: 'Motel', correct: false }, { text: 'Hostel', correct: false }, { text: 'Resort', correct: false }] },
              { type: 'ASSIST', question: 'What does "book" mean?', correctAnswer: 'Đặt trước', options: [{ text: 'Đặt trước', correct: true }, { text: 'Hủy', correct: false }, { text: 'Thay đổi', correct: false }, { text: 'Xác nhận', correct: false }] },
              { type: 'TYPE', question: 'Complete: I want to _ a room.', correctAnswer: 'book', options: [] },
              { type: 'SELECT', question: 'Which is a room type?', correctAnswer: null, options: [{ text: 'Double room', correct: true }, { text: 'Room type', correct: false }, { text: 'Room number', correct: false }, { text: 'Room key', correct: false }] },
              { type: 'ASSIST', question: '"Phòng đơn" in English?', correctAnswer: 'Single room', options: [{ text: 'Single room', correct: true }, { text: 'Double room', correct: false }, { text: 'Twin room', correct: false }, { text: 'Suite', correct: false }] },
            ],
          },
          {
            title: 'Hotel Services',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "lễ tân"?', correctAnswer: null, options: [{ text: 'Reception', correct: true }, { text: 'Lobby', correct: false }, { text: 'Concierge', correct: false }, { text: 'Bellboy', correct: false }] },
              { type: 'ASSIST', question: 'What does "check out" mean?', correctAnswer: 'Trả phòng', options: [{ text: 'Trả phòng', correct: true }, { text: 'Nhận phòng', correct: false }, { text: 'Đặt phòng', correct: false }, { text: 'Hủy phòng', correct: false }] },
              { type: 'TYPE', question: 'Complete: What time is _?', correctAnswer: 'checkout', options: [] },
              { type: 'SELECT', question: 'Which is a hotel service?', correctAnswer: null, options: [{ text: 'Room service', correct: true }, { text: 'Airport', correct: false }, { text: 'Restaurant', correct: false }, { text: 'Shop', correct: false }] },
              { type: 'ASSIST', question: '"WiFi" in English?', correctAnswer: 'WiFi', options: [{ text: 'WiFi', correct: true }, { text: 'Internet', correct: false }, { text: 'Cable', correct: false }, { text: 'Phone', correct: false }] },
            ],
          },
          {
            title: 'Hotel Problems',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "điều hòa"?', correctAnswer: null, options: [{ text: 'Air conditioning', correct: true }, { text: 'Fan', correct: false }, { text: 'Heater', correct: false }, { text: 'Vent', correct: false }] },
              { type: 'ASSIST', question: 'What does "broken" mean?', correctAnswer: 'Hỏng', options: [{ text: 'Hỏng', correct: true }, { text: 'Mới', correct: false }, { text: 'Tốt', correct: false }, { text: 'Cũ', correct: false }] },
              { type: 'TYPE', question: 'Complete: The TV is _.', correctAnswer: 'broken', options: [] },
              { type: 'SELECT', question: 'Which is a room problem?', correctAnswer: null, options: [{ text: 'Noisy', correct: true }, { text: 'Clean', correct: false }, { text: 'Nice', correct: false }, { text: 'Big', correct: false }] },
              { type: 'ASSIST', question: '"Rò rỉ" in English?', correctAnswer: 'Leaking', options: [{ text: 'Leaking', correct: true }, { text: 'Running', correct: false }, { text: 'Flowing', correct: false }, { text: 'Dripping', correct: false }] },
            ],
          },
          {
            title: 'Amenities',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "bể bơi"?', correctAnswer: null, options: [{ text: 'Swimming pool', correct: true }, { text: 'Beach', correct: false }, { text: 'Lake', correct: false }, { text: 'Gym', correct: false }] },
              { type: 'ASSIST', question: 'What does "gym" mean?', correctAnswer: 'Phòng gym', options: [{ text: 'Phòng gym', correct: true }, { text: 'Bể bơi', correct: false }, { text: 'Spa', correct: false }, { text: 'Sauna', correct: false }] },
              { type: 'TYPE', question: 'Complete: Is there a _ available?', correctAnswer: 'gym', options: [] },
              { type: 'SELECT', question: 'Which is a hotel amenity?', correctAnswer: null, options: [{ text: 'Spa', correct: true }, { text: 'Hospital', correct: false }, { text: 'School', correct: false }, { text: 'Bank', correct: false }] },
              { type: 'ASSIST', question: '"Bãi đỗ xe" in English?', correctAnswer: 'Parking lot', options: [{ text: 'Parking lot', correct: true }, { text: 'Garage', correct: false }, { text: 'Carport', correct: false }, { text: 'Driveway', correct: false }] },
            ],
          },
          {
            title: 'Hotel Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "sạch sẽ"?', correctAnswer: null, options: [{ text: 'Clean', correct: true }, { text: 'Dirty', correct: false }, { text: 'Neat', correct: false }, { text: 'Tidy', correct: false }] },
              { type: 'ASSIST', question: 'What does "comfortable" mean?', correctAnswer: 'Thoải mái', options: [{ text: 'Thoải mái', correct: true }, { text: 'Chật', correct: false }, { text: 'Rộng', correct: false }, { text: 'Nhỏ', correct: false }] },
              { type: 'TYPE', question: 'Complete: The bed is very _.', correctAnswer: 'comfortable', options: [] },
              { type: 'SELECT', question: 'Which is a positive review?', correctAnswer: null, options: [{ text: 'Excellent', correct: true }, { text: 'Terrible', correct: false }, { text: 'Awful', correct: false }, { text: 'Poor', correct: false }] },
              { type: 'ASSIST', question: '"Giá cả" in English?', correctAnswer: 'Price', options: [{ text: 'Price', correct: true }, { text: 'Quality', correct: false }, { text: 'Service', correct: false }, { text: 'Value', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Transportation',
        description: 'Get around using different transportation',
        order: 2,
        lessons: [
          {
            title: 'Public Transport',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "xe buýt"?', correctAnswer: null, options: [{ text: 'Bus', correct: true }, { text: 'Taxi', correct: false }, { text: 'Train', correct: false }, { text: 'Subway', correct: false }] },
              { type: 'ASSIST', question: 'What does "subway" mean?', correctAnswer: 'Tàu điện ngầm', options: [{ text: 'Tàu điện ngầm', correct: true }, { text: 'Xe buýt', correct: false }, { text: 'Tàu hỏa', correct: false }, { text: 'Xe điện', correct: false }] },
              { type: 'TYPE', question: 'Complete: Where is the _ stop?', correctAnswer: 'bus', options: [] },
              { type: 'SELECT', question: 'Which is a train station?', correctAnswer: null, options: [{ text: 'Station', correct: true }, { text: 'Platform', correct: false }, { text: 'Track', correct: false }, { text: 'Rail', correct: false }] },
              { type: 'ASSIST', question: '"Ga tàu" in English?', correctAnswer: 'Train station', options: [{ text: 'Train station', correct: true }, { text: 'Bus station', correct: false }, { text: 'Airport', correct: false }, { text: 'Port', correct: false }] },
            ],
          },
          {
            title: 'Taxis & Rides',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "taxi"?', correctAnswer: null, options: [{ text: 'Taxi', correct: true }, { text: 'Bus', correct: false }, { text: 'Car', correct: false }, { text: 'Van', correct: false }] },
              { type: 'ASSIST', question: 'What does "meter" mean?', correctAnswer: 'Đồng hồ đo', options: [{ text: 'Đồng hồ đo', correct: true }, { text: 'Đồng hồ', correct: false }, { text: 'Máy đo', correct: false }, { text: 'Bảng điểm', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please use the _.', correctAnswer: 'meter', options: [] },
              { type: 'SELECT', question: 'Which is a ride-sharing app?', correctAnswer: null, options: [{ text: 'Uber', correct: true }, { text: 'Taxi', correct: false }, { text: 'Bus', correct: false }, { text: 'Metro', correct: false }] },
              { type: 'ASSIST', question: '"Điểm đón" in English?', correctAnswer: 'Pickup point', options: [{ text: 'Pickup point', correct: true }, { text: 'Drop-off point', correct: false }, { text: 'Destination', correct: false }, { text: 'Address', correct: false }] },
            ],
          },
          {
            title: 'Directions',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "đi thẳng"?', correctAnswer: null, options: [{ text: 'Go straight', correct: true }, { text: 'Turn left', correct: false }, { text: 'Turn right', correct: false }, { text: 'Stop', correct: false }] },
              { type: 'ASSIST', question: 'What does "turn left" mean?', correctAnswer: 'Rẽ trái', options: [{ text: 'Rẽ trái', correct: true }, { text: 'Rẽ phải', correct: false }, { text: 'Đi thẳng', correct: false }, { text: 'Quay đầu', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ at the corner.', correctAnswer: 'Turn right', options: [] },
              { type: 'SELECT', question: 'Which is a direction?', correctAnswer: null, options: [{ text: 'North', correct: true }, { text: 'Center', correct: false }, { text: 'Middle', correct: false }, { text: 'Side', correct: false }] },
              { type: 'ASSIST', question: '"Phía sau" in English?', correctAnswer: 'Behind', options: [{ text: 'Behind', correct: true }, { text: 'In front of', correct: false }, { text: 'Next to', correct: false }, { text: 'Between', correct: false }] },
            ],
          },
          {
            title: 'Renting a Car',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "thuê xe"?', correctAnswer: null, options: [{ text: 'Rent a car', correct: true }, { text: 'Buy a car', correct: false }, { text: 'Sell a car', correct: false }, { text: 'Drive a car', correct: false }] },
              { type: 'ASSIST', question: 'What does "license" mean?', correctAnswer: 'Bằng lái', options: [{ text: 'Bằng lái', correct: true }, { text: 'Hộ chiếu', correct: false }, { text: 'Visa', correct: false }, { text: 'ID', correct: false }] },
              { type: 'TYPE', question: 'Complete: Do you have an international _.', correctAnswer: 'license', options: [] },
              { type: 'SELECT', question: 'Which is a car type?', correctAnswer: null, options: [{ text: 'Sedan', correct: true }, { text: 'Car', correct: false }, { text: 'Vehicle', correct: false }, { text: 'Auto', correct: false }] },
              { type: 'ASSIST', question: '"Xe tải" in English?', correctAnswer: 'Truck', options: [{ text: 'Truck', correct: true }, { text: 'Van', correct: false }, { text: 'Bus', correct: false }, { text: 'Car', correct: false }] },
            ],
          },
          {
            title: 'Travel Test',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "bản đồ"?', correctAnswer: null, options: [{ text: 'Map', correct: true }, { text: 'Guide', correct: false }, { text: 'Book', correct: false }, { text: 'List', correct: false }] },
              { type: 'ASSIST', question: 'What does "itinerary" mean?', correctAnswer: 'Lịch trình', options: [{ text: 'Lịch trình', correct: true }, { text: 'Địa điểm', correct: false }, { text: 'Điểm đến', correct: false }, { text: 'Lộ trình', correct: false }] },
              { type: 'TYPE', question: 'Complete: I need a _.', correctAnswer: 'map', options: [] },
              { type: 'SELECT', question: 'Which is travel-related?', correctAnswer: null, options: [{ text: 'Passport', correct: true }, { text: 'Library', correct: false }, { text: 'School', correct: false }, { text: 'Office', correct: false }] },
              { type: 'ASSIST', question: '"Hải quan" in English?', correctAnswer: 'Customs', options: [{ text: 'Customs', correct: true }, { text: 'Security', correct: false }, { text: 'Immigration', correct: false }, { text: 'Border', correct: false }] },
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // COURSE 4: WORK & BUSINESS - Advanced English
  // ============================================================
  {
    course: {
      slug: 'work-business',
      title: 'Work & Business',
      description: 'English for professional settings, meetings, emails, and workplace communication.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'intermediate',
      order: 3,
      isPublished: true,
      thumbnailUrl: 'https://cdn.duolingo.com/image/work.png',
      imageSrc: 'https://cdn.duolingo.com/image/work.png',
      language: 'en',
      difficulty: 'intermediate',
      isActive: true,
    },
    units: [
      {
        title: 'Job & Career',
        description: 'Vocabulary for jobs job search',
        order: 0,
        lessons: [
          {
            title: 'Job Titles',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "giám đốc"?', correctAnswer: null, options: [{ text: 'Director', correct: true }, { text: 'Manager', correct: false }, { text: 'CEO', correct: false }, { text: 'President', correct: false }] },
              { type: 'ASSIST', question: 'What does "manager" mean?', correctAnswer: 'Quản lý', options: [{ text: 'Quản lý', correct: true }, { text: 'Giám đốc', correct: false }, { text: 'Trưởng phòng', correct: false }, { text: 'Nhân viên', correct: false }] },
              { type: 'TYPE', question: 'Complete: The _ handles finances.', correctAnswer: 'accountant', options: [] },
              { type: 'SELECT', question: 'Which is an IT job?', correctAnswer: null, options: [{ text: 'Developer', correct: true }, { text: 'Teacher', correct: false }, { text: 'Doctor', correct: false }, { text: 'Lawyer', correct: false }] },
              { type: 'ASSIST', question: '"Nhân viên" in English?', correctAnswer: 'Employee', options: [{ text: 'Employee', correct: true }, { text: 'Employer', correct: false }, { text: 'Boss', correct: false }, { text: 'Manager', correct: false }] },
            ],
          },
          {
            title: 'Job Search',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "hồ sơ"?', correctAnswer: null, options: [{ text: 'Resume', correct: true }, { text: 'CV', correct: false }, { text: 'Letter', correct: false }, { text: 'Form', correct: false }] },
              { type: 'ASSIST', question: 'What does "interview" mean?', correctAnswer: 'Phỏng vấn', options: [{ text: 'Phỏng vấn', correct: true }, { text: 'Kiểm tra', correct: false }, { text: 'Thi', correct: false }, { text: 'Họp', correct: false }] },
              { type: 'TYPE', question: 'Complete: I have a job _.', correctAnswer: 'interview', options: [] },
              { type: 'SELECT', question: 'Which is a job search verb?', correctAnswer: null, options: [{ text: 'Apply', correct: true }, { text: 'Fire', correct: false }, { text: 'Hire', correct: false }, { text: 'Resign', correct: false }] },
              { type: 'ASSIST', question: '"Ứng tuyển" in English?', correctAnswer: 'Apply', options: [{ text: 'Apply', correct: true }, { text: 'Apply for', correct: false }, { text: 'Apply to', correct: false }, { text: 'Request', correct: false }] },
            ],
          },
          {
            title: 'Workplace Skills',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "kỹ năng"?', correctAnswer: null, options: [{ text: 'Skills', correct: true }, { text: 'Jobs', correct: false }, { text: 'Tasks', correct: false }, { text: 'Duties', correct: false }] },
              { type: 'ASSIST', question: 'What does "experience" mean?', correctAnswer: 'Kinh nghiệm', options: [{ text: 'Kinh nghiệm', correct: true }, { text: 'Kỹ năng', correct: false }, { text: 'Bằng cấp', correct: false }, { text: 'Kiến thức', correct: false }] },
              { type: 'TYPE', question: 'Complete: I have 5 years of _.', correctAnswer: 'experience', options: [] },
              { type: 'SELECT', question: 'Which is a soft skill?', correctAnswer: null, options: [{ text: 'Communication', correct: true }, { text: 'Coding', correct: false }, { text: 'Accounting', correct: false }, { text: 'Engineering', correct: false }] },
              { type: 'ASSIST', question: '"Làm việc nhóm" in English?', correctAnswer: 'Teamwork', options: [{ text: 'Teamwork', correct: true }, { text: 'Solo work', correct: false }, { text: 'Individual', correct: false }, { text: 'Self-work', correct: false }] },
            ],
          },
          {
            title: 'Job Benefits',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "lương"?', correctAnswer: null, options: [{ text: 'Salary', correct: true }, { text: 'Bonus', correct: false }, { text: 'Commission', correct: false }, { text: 'Allowance', correct: false }] },
              { type: 'ASSIST', question: 'What does "bonus" mean?', correctAnswer: 'Thưởng', options: [{ text: 'Thưởng', correct: true }, { text: 'Lương', correct: false }, { text: 'Phụ cấp', correct: false }, { text: 'Lợi ích', correct: false }] },
              { type: 'TYPE', question: 'Complete: We offer competitive _.', correctAnswer: 'salary', options: [] },
              { type: 'SELECT', question: 'Which is a work benefit?', correctAnswer: null, options: [{ text: 'Insurance', correct: true }, { text: 'Salary', correct: false }, { text: 'Tax', correct: false }, { text: 'Fee', correct: false }] },
              { type: 'ASSIST', question: '"Nghỉ phép" in English?', correctAnswer: 'Vacation', options: [{ text: 'Vacation', correct: true }, { text: 'Holiday', correct: false }, { text: 'Leave', correct: false }, { text: 'Break', correct: false }] },
            ],
          },
          {
            title: 'Career Growth',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "thăng tiến"?', correctAnswer: null, options: [{ text: 'Get promoted', correct: true }, { text: 'Get fired', correct: false }, { text: 'Get hired', correct: false }, { text: 'Get trained', correct: false }] },
              { type: 'ASSIST', question: 'What does "promotion" mean?', correctAnswer: 'Thăng chức', options: [{ text: 'Thăng chức', correct: true }, { text: 'Giáng chức', correct: false }, { text: 'Từ chức', correct: false }, { text: 'Nghỉ việc', correct: false }] },
              { type: 'TYPE', question: 'Complete: I want to _ in my career.', correctAnswer: 'advance', options: [] },
              { type: 'SELECT', question: 'Which means "từ chức"?', correctAnswer: null, options: [{ text: 'Resign', correct: true }, { text: 'Retire', correct: false }, { text: 'Fire', correct: false }, { text: 'Hire', correct: false }] },
              { type: 'ASSIST', question: '"Đào tạo" in English?', correctAnswer: 'Training', options: [{ text: 'Training', correct: true }, { text: 'Teaching', correct: false }, { text: 'Learning', correct: false }, { text: 'Studying', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Office Life',
        description: 'Day-to-day office communication',
        order: 1,
        lessons: [
          {
            title: 'Office Items',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "máy tính"?', correctAnswer: null, options: [{ text: 'Computer', correct: true }, { text: 'Laptop', correct: false }, { text: 'Monitor', correct: false }, { text: 'Keyboard', correct: false }] },
              { type: 'ASSIST', question: 'What does "printer" mean?', correctAnswer: 'Máy in', options: [{ text: 'Máy in', correct: true }, { text: 'Máy photocopy', correct: false }, { text: 'Máy fax', correct: false }, { text: 'Máy quét', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please _ this document.', correctAnswer: 'print', options: [] },
              { type: 'SELECT', question: 'Which is office equipment?', correctAnswer: null, options: [{ text: 'Projector', correct: true }, { text: 'Table', correct: false }, { text: 'Chair', correct: false }, { text: 'Lamp', correct: false }] },
              { type: 'ASSIST', question: '"Máy chiếu" in English?', correctAnswer: 'Projector', options: [{ text: 'Projector', correct: true }, { text: 'Screen', correct: false }, { text: 'Monitor', correct: false }, { text: 'Display', correct: false }] },
            ],
          },
          {
            title: 'Email Communication',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'How do you say "email"?', correctAnswer: null, options: [{ text: 'Email', correct: true }, { text: 'Letter', correct: false }, { text: 'Message', correct: false }, { text: 'Note', correct: false }] },
              { type: 'ASSIST', question: 'What does "attach" mean?', correctAnswer: 'Đính kèm', options: [{ text: 'Đính kèm', correct: true }, { text: 'Gửi', correct: false }, { text: 'Nhận', correct: false }, { text: 'Xóa', correct: false }] },
              { type: 'TYPE', question: 'Complete: I will _ the file.', correctAnswer: 'attach', options: [] },
              { type: 'SELECT', question: 'Which is an email phrase?', correctAnswer: null, options: [{ text: 'Best regards', correct: true }, { text: 'Thank you much', correct: false }, { text: 'Many thanks', correct: false }, { text: 'Thanks a lot', correct: false }] },
              { type: 'ASSIST', question: '"CC" in English?', correctAnswer: 'CC', options: [{ text: 'CC', correct: true }, { text: 'BCC', correct: false }, { text: 'Reply', correct: false }, { text: 'Forward', correct: false }] },
            ],
          },
          {
            title: 'Meetings',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'What is "cuộc họp"?', correctAnswer: null, options: [{ text: 'Meeting', correct: true }, { text: 'Conference', correct: false }, { text: 'Call', correct: false }, { text: 'Session', correct: false }] },
              { type: 'ASSIST', question: 'What does "agenda" mean?', correctAnswer: 'Chương trình họp', options: [{ text: 'Chương trình họp', correct: true }, { text: 'Biên bản', correct: false }, { text: 'Nghị quyết', correct: false }, { text: 'Quyết định', correct: false }] },
              { type: 'TYPE', question: 'Complete: Let\'s _ the meeting.', correctAnswer: 'schedule', options: [] },
              { type: 'SELECT', question: 'Which is a meeting verb?', correctAnswer: null, options: [{ text: 'Attend', correct: true }, { text: 'Skip', correct: false }, { text: 'Miss', correct: false }, { text: 'Lose', correct: false }] },
              { type: 'ASSIST', question: '"Hoãn" in English?', correctAnswer: 'Postpone', options: [{ text: 'Postpone', correct: true }, { text: 'Cancel', correct: false }, { text: 'Delay', correct: false }, { text: 'Reschedule', correct: false }] },
            ],
          },
          {
            title: 'Phone Calls',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'How do you say "cuộc gọi"?', correctAnswer: null, options: [{ text: 'Call', correct: true }, { text: 'Text', correct: false }, { text: 'Message', correct: false }, { text: 'Chat', correct: false }] },
              { type: 'ASSIST', question: 'What does "hold" mean?', correctAnswer: 'Chờ đợi', options: [{ text: 'Chờ đợi', correct: true }, { text: 'Gác máy', correct: false }, { text: 'Chuyển', correct: false }, { text: 'Ráng', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please hold _.', correctAnswer: 'on', options: [] },
              { type: 'SELECT', question: 'Which is a phone phrase?', correctAnswer: null, options: [{ text: 'Calling from', correct: true }, { text: 'Coming from', correct: false }, { text: 'Going to', correct: false }, { text: 'Arriving at', correct: false }] },
              { type: 'ASSIST', question: '"Ráng máy" in English?', correctAnswer: 'Hang up', options: [{ text: 'Hang up', correct: true }, { text: 'Call back', correct: false }, { text: 'Pick up', correct: false }, { text: 'Put down', correct: false }] },
            ],
          },
          {
            title: 'Office Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "họp"?', correctAnswer: null, options: [{ text: 'Meet', correct: true }, { text: 'Talk', correct: false }, { text: 'Chat', correct: false }, { text: 'Discuss', correct: false }] },
              { type: 'ASSIST', question: 'What does "deadline" mean?', correctAnswer: 'Hạn chót', options: [{ text: 'Hạn chót', correct: true }, { text: 'Ngày bắt đầu', correct: false }, { text: 'Ngày kết thúc', correct: false }, { text: 'Lịch', correct: false }] },
              { type: 'TYPE', question: 'Complete: I have a _.', correctAnswer: 'deadline', options: [] },
              { type: 'SELECT', question: 'Which means "báo cáo"?', correctAnswer: null, options: [{ text: 'Report', correct: true }, { text: 'Presentation', correct: false }, { text: 'Summary', correct: false }, { text: 'Note', correct: false }] },
              { type: 'ASSIST', question: '"Nghỉ giải lao" in English?', correctAnswer: 'Break', options: [{ text: 'Break', correct: true }, { text: 'Leave', correct: false }, { text: 'Exit', correct: false }, { text: 'Rest', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Business Communication',
        description: 'Professional writing and speaking',
        order: 2,
        lessons: [
          {
            title: 'Business Writing',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "báo cáo"?', correctAnswer: null, options: [{ text: 'Report', correct: true }, { text: 'Letter', correct: false }, { text: 'Memo', correct: false }, { text: 'Notice', correct: false }] },
              { type: 'ASSIST', question: 'What does "proposal" mean?', correctAnswer: 'Đề xuất', options: [{ text: 'Đề xuất', correct: true }, { text: 'Báo cáo', correct: false }, { text: 'Hợp đồng', correct: false }, { text: 'Thỏa thuận', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please _ the proposal.', correctAnswer: 'review', options: [] },
              { type: 'SELECT', question: 'Which is a business document?', correctAnswer: null, options: [{ text: 'Contract', correct: true }, { text: 'Story', correct: false }, { text: 'Novel', correct: false }, { text: 'Article', correct: false }] },
              { type: 'ASSIST', question: '"Hợp đồng" in English?', correctAnswer: 'Contract', options: [{ text: 'Contract', correct: true }, { text: 'Agreement', correct: false }, { text: 'Deal', correct: false }, { text: 'Plan', correct: false }] },
            ],
          },
          {
            title: 'Negotiations',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'How do you say "thương lượng"?', correctAnswer: null, options: [{ text: 'Negotiate', correct: true }, { text: 'Discuss', correct: false }, { text: 'Decide', correct: false }, { text: 'Agree', correct: false }] },
              { type: 'ASSIST', question: 'What does "deal" mean?', correctAnswer: 'Thỏa thuận', options: [{ text: 'Thỏa thuận', correct: true }, { text: 'Mua', correct: false }, { text: 'Bán', correct: false }, { text: 'Trao đổi', correct: false }] },
              { type: 'TYPE', question: 'Complete: That\'s a great _.', correctAnswer: 'deal', options: [] },
              { type: 'SELECT', question: 'Which is a negotiation verb?', correctAnswer: null, options: [{ text: 'Compromise', correct: true }, { text: 'Win', correct: false }, { text: 'Lose', correct: false }, { text: 'Quit', correct: false }] },
              { type: 'ASSIST', question: '"Nhượng bộ" in English?', correctAnswer: 'Concede', options: [{ text: 'Concede', correct: true }, { text: 'Accept', correct: false }, { text: 'Reject', correct: false }, { text: 'Deny', correct: false }] },
            ],
          },
          {
            title: 'Presentations',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'What is "thuyết trình"?', correctAnswer: null, options: [{ text: 'Presentation', correct: true }, { text: 'Meeting', correct: false }, { text: 'Discussion', correct: false }, { text: 'Conference', correct: false }] },
              { type: 'ASSIST', question: 'What does "slide" mean?', correctAnswer: 'Trang chiếu', options: [{ text: 'Trang chiếu', correct: true }, { text: 'Bài giảng', correct: false }, { text: 'Bảng', correct: false }, { text: 'Biểu đồ', correct: false }] },
              { type: 'TYPE', question: 'Complete: Can you see my _.', correctAnswer: 'slides', options: [] },
              { type: 'SELECT', question: 'Which is a presentation phrase?', correctAnswer: null, options: [{ text: 'In conclusion', correct: true }, { text: 'In conclusion', correct: false }, { text: 'To summarize', correct: false }, { text: 'Finally', correct: false }] },
              { type: 'ASSIST', question: '"Hãy xem" in English?', correctAnswer: 'Let\'s look at', options: [{ text: 'Let\'s look at', correct: true }, { text: 'Let\'s see', correct: false }, { text: 'Let\'s check', correct: false }, { text: 'Look at', correct: false }] },
            ],
          },
          {
            title: 'Business Meetings',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'How do you say "lợi nhuận"?', correctAnswer: null, options: [{ text: 'Profit', correct: true }, { text: 'Revenue', correct: false }, { text: 'Income', correct: false }, { text: 'Earning', correct: false }] },
              { type: 'ASSIST', question: 'What does "investment" mean?', correctAnswer: 'Đầu tư', options: [{ text: 'Đầu tư', correct: true }, { text: 'Vay', correct: false }, { text: 'Tiết kiệm', correct: false }, { text: 'Chi tiêu', correct: false }] },
              { type: 'TYPE', question: 'Complete: We need more _.', correctAnswer: 'investment', options: [] },
              { type: 'SELECT', question: 'Which is a business term?', correctAnswer: null, options: [{ text: 'Revenue', correct: true }, { text: 'Money', correct: false }, { text: 'Cash', correct: false }, { text: 'Funds', correct: false }] },
              { type: 'ASSIST', question: '"Doanh thu" in English?', correctAnswer: 'Revenue', options: [{ text: 'Revenue', correct: true }, { text: 'Profit', correct: false }, { text: 'Sales', correct: false }, { text: 'Turnover', correct: false }] },
            ],
          },
          {
            title: 'Business Test',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'How do you say "chiến lược"?', correctAnswer: null, options: [{ text: 'Strategy', correct: true }, { text: 'Tactic', correct: false }, { text: 'Plan', correct: false }, { text: 'Goal', correct: false }] },
              { type: 'ASSIST', question: 'What does "target" mean?', correctAnswer: 'Mục tiêu', options: [{ text: 'Mục tiêu', correct: true }, { text: 'Chiến lược', correct: false }, { text: 'Kế hoạch', correct: false }, { text: 'Nhiệm vụ', correct: false }] },
              { type: 'TYPE', question: 'Complete: What are your _ goals?', correctAnswer: 'business', options: [] },
              { type: 'SELECT', question: 'Which is a business adjective?', correctAnswer: null, options: [{ text: 'Profitable', correct: true }, { text: 'Money', correct: false }, { text: 'Sales', correct: false }, { text: 'Deal', correct: false }] },
              { type: 'ASSIST', question: '"Phát triển" in English?', correctAnswer: 'Develop', options: [{ text: 'Develop', correct: true }, { text: 'Decrease', correct: false }, { text: 'Decline', correct: false }, { text: 'Reduce', correct: false }] },
            ],
          },
        ],
      },
    ],
  },

  // ============================================================
  // COURSE 5: CULTURE & Idioms - Advanced English
  // ============================================================
  {
    course: {
      slug: 'culture-idioms',
      title: 'Culture & Idioms',
      description: 'Understand English culture, idioms, expressions, and everyday slang.',
      languageFrom: 'vi',
      languageTo: 'en',
      level: 'advanced',
      order: 4,
      isPublished: true,
      thumbnailUrl: 'https://cdn.duolingo.com/image/culture.png',
      imageSrc: 'https://cdn.duolingo.com/image/culture.png',
      language: 'en',
      difficulty: 'advanced',
      isActive: true,
    },
    units: [
      {
        title: 'English Idioms',
        description: 'Common idioms and their meanings',
        order: 0,
        lessons: [
          {
            title: 'Body Idioms',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What does "break a leg" mean?', correctAnswer: null, options: [{ text: 'Good luck', correct: true }, { text: 'Be careful', correct: false }, { text: 'Stop', correct: false }, { text: 'Go fast', correct: false }] },
              { type: 'ASSIST', question: 'What does "piece of cake" mean?', correctAnswer: 'Dễ như ăn bánh', options: [{ text: 'Dễ như ăn bánh', correct: true }, { text: 'Khó quá', correct: false }, { text: 'Ngon', correct: false }, { text: 'Mệt', correct: false }] },
              { type: 'TYPE', question: 'Complete: That exam was a _ of cake.', correctAnswer: 'piece', options: [] },
              { type: 'SELECT', question: 'Which idiom means "being honest"?', correctAnswer: null, options: [{ text: 'Spill the beans', correct: true }, { text: 'Hit the nail', correct: false }, { text: 'Break a leg', correct: false }, { text: 'Bite the bullet', correct: false }] },
              { type: 'ASSIST', question: '"Lộ bí mật" in English idiom?', correctAnswer: 'Spill the beans', options: [{ text: 'Spill the beans', correct: true }, { text: 'Break the news', correct: false }, { text: 'Keep the secret', correct: false }, { text: 'Tell lies', correct: false }] },
            ],
          },
          {
            title: 'Animal Idioms',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What does "let the cat out of the bag" mean?', correctAnswer: null, options: [{ text: 'Reveal a secret', correct: true }, { text: 'Feed a cat', correct: false }, { text: 'Buy a cat', correct: false }, { text: 'Catch a cat', correct: false }] },
              { type: 'ASSIST', question: 'What does " raining cats and dogs" mean?', correctAnswer: 'Mưa to', options: [{ text: 'Mưa to', correct: true }, { text: 'Nắng', correct: false }, { text: 'Mưa nhỏ', correct: false }, { text: 'Gió', correct: false }] },
              { type: 'TYPE', question: 'Complete: It\'s _ cats and dogs outside.', correctAnswer: 'raining', options: [] },
              { type: 'SELECT', question: 'Which idiom means "be quiet"?', correctAnswer: null, options: [{ text: 'Let the cat out', correct: false }, { text: 'Hold your horses', correct: true }, { text: 'Take the bull', correct: false }, { text: 'Elephant in', correct: false }] },
              { type: 'ASSIST', question: '"Im lặng" in English idiom?', correctAnswer: 'Keep a stiff upper lip', options: [{ text: 'Keep a stiff upper lip', correct: true }, { text: 'Speak up', correct: false }, { text: 'Talk back', correct: false }, { text: 'Say nothing', correct: false }] },
            ],
          },
          {
            title: 'Time Idioms',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'What does "once in a blue moon" mean?', correctAnswer: null, options: [{ text: 'Rarely', correct: true }, { text: 'Often', correct: false }, { text: 'Always', correct: false }, { text: 'Never', correct: false }] },
              { type: 'ASSIST', question: 'What does "the last minute" mean?', correctAnswer: 'Phút cuối', options: [{ text: 'Phút cuối', correct: true }, { text: 'Phút đầu', correct: false }, { text: 'Giờ', correct: false }, { text: 'Ngày', correct: false }] },
              { type: 'TYPE', question: 'Complete: Don\'t wait until the _ minute.', correctAnswer: 'last', options: [] },
              { type: 'SELECT', question: 'Which idiom means "immediately"?', correctAnswer: null, options: [{ text: 'Right away', correct: true }, { text: 'Once in a blue moon', correct: false }, { text: 'At the eleventh hour', correct: false }, { text: 'In the nick of time', correct: false }] },
              { type: 'ASSIST', question: '"Rất hiếm khi" in English idiom?', correctAnswer: 'Once in a blue moon', options: [{ text: 'Once in a blue moon', correct: true }, { text: 'Every now and then', correct: false }, { text: 'All the time', correct: false }, { text: 'From time to time', correct: false }] },
            ],
          },
          {
            title: 'Money Idioms',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What does "cost an arm and a leg" mean?', correctAnswer: null, options: [{ text: 'Very expensive', correct: true }, { text: 'Very cheap', correct: false }, { text: 'Free', correct: false }, { text: 'Worthless', correct: false }] },
              { type: 'ASSIST', question: 'What does "break the bank" mean?', correctAnswer: 'Tốn quá nhiều tiền', options: [{ text: 'Tốn quá nhiều tiền', correct: true }, { text: 'Tiết kiệm', correct: false }, { text: 'Kiếm tiền', correct: false }, { text: 'Mất tiền', correct: false }] },
              { type: 'TYPE', question: 'Complete: That car _ the bank.', correctAnswer: 'broke', options: [] },
              { type: 'SELECT', question: 'Which idiom means "free"?', correctAnswer: null, options: [{ text: 'For free', correct: true }, { text: 'Cost an arm', correct: false }, { text: 'Spend money', correct: false }, { text: 'Pay up', correct: false }] },
              { type: 'ASSIST', question: '"Được lời" in English idiom?', correctAnswer: 'In the black', options: [{ text: 'In the black', correct: true }, { text: 'In the red', correct: false }, { text: 'Break even', correct: false }, { text: 'Pay off', correct: false }] },
            ],
          },
          {
            title: 'Idioms Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'What does "hit the nail on the head" mean?', correctAnswer: null, options: [{ text: 'Exactly right', correct: true }, { text: 'Make a mistake', correct: false }, { text: 'Be wrong', correct: false }, { text: 'Work hard', correct: false }] },
              { type: 'ASSIST', question: 'What does " under the weather" mean?', correctAnswer: 'Không khỏe', options: [{ text: 'Không khỏe', correct: true }, { text: 'Nắng', correct: false }, { text: 'Mưa', correct: false }, { text: 'Ấm', correct: false }] },
              { type: 'TYPE', question: 'Complete: I\'m feeling _ the weather.', correctAnswer: 'under', options: [] },
              { type: 'SELECT', question: 'Which idiom means "leave quickly"?', correctAnswer: null, options: [{ text: 'Hit the road', correct: true }, { text: 'Take a break', correct: false }, { text: 'Make a plan', correct: false }, { text: 'Go home', correct: false }] },
              { type: 'ASSIST', question: '"Bắt đầu" in English idiom?', correctAnswer: 'Get the ball rolling', options: [{ text: 'Get the ball rolling', correct: true }, { text: 'Stop the ball', correct: false }, { text: 'Catch the ball', correct: false }, { text: 'Drop the ball', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Everyday Expressions',
        description: 'Common expressions for daily use',
        order: 1,
        lessons: [
          {
            title: 'Greetings & Farewells',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What does "long time no see" mean?', correctAnswer: null, options: [{ text: 'We haven\'t met for a while', correct: true }, { text: 'See you soon', correct: false }, { text: 'Goodbye', correct: false }, { text: 'Hello', correct: false }] },
              { type: 'ASSIST', question: 'What does "take care" mean?', correctAnswer: 'Giữ gìn sức khỏe', options: [{ text: 'Giữ gìn sức khỏe', correct: true }, { text: 'Làm việc', correct: false }, { text: 'Học hành', correct: false }, { text: 'Ăn uống', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ care and see you soon!', correctAnswer: 'Take', options: [] },
              { type: 'SELECT', question: 'Which is a casual farewell?', correctAnswer: null, options: [{ text: 'Catch you later', correct: true }, { text: 'Farewell', correct: false }, { text: 'Adieu', correct: false }, { text: 'Good day', correct: false }] },
              { type: 'ASSIST', question: '"Hẹn gặp lại" in English?', correctAnswer: 'See you again', options: [{ text: 'See you again', correct: true }, { text: 'Meet you', correct: false }, { text: 'Come again', correct: false }, { text: 'Again', correct: false }] },
            ],
          },
          {
            title: 'Agreement & Disagreement',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What does "I couldn\'t agree more" mean?', correctAnswer: null, options: [{ text: 'I fully agree', correct: true }, { text: 'I disagree', correct: false }, { text: 'Maybe', correct: false }, { text: 'I\'m not sure', correct: false }] },
              { type: 'ASSIST', question: 'What does "fair enough" mean?', correctAnswer: 'Hợp lý đấy', options: [{ text: 'Hợp lý đấy', correct: true }, { text: 'Không công bằng', correct: false }, { text: 'Đủ rồi', correct: false }, { text: 'Quá đủ', correct: false }] },
              { type: 'TYPE', question: 'Complete: I _ with you on that.', correctAnswer: 'agree', options: [] },
              { type: 'SELECT', question: 'Which expresses strong disagreement?', correctAnswer: null, options: [{ text: 'No way', correct: true }, { text: 'Maybe', correct: false }, { text: 'Perhaps', correct: false }, { text: 'Possibly', correct: false }] },
              { type: 'ASSIST', question: '"Tôi không đồng ý" in English?', correctAnswer: 'I disagree', options: [{ text: 'I disagree', correct: true }, { text: 'I agree', correct: false }, { text: 'I think so', correct: false }, { text: 'Maybe', correct: false }] },
            ],
          },
          {
            title: 'Making Requests',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'How do you say "bạn có thể...?"', correctAnswer: null, options: [{ text: 'Could you...?', correct: true }, { text: 'Do you want?', correct: false }, { text: 'Will you?', correct: false }, { text: 'Would you mind?', correct: false }] },
              { type: 'ASSIST', question: 'What does "Would you mind" mean?', correctAnswer: 'Bạn có phiền không?', options: [{ text: 'Bạn có phiền không?', correct: true }, { text: 'Bạn muốn?', correct: false }, { text: 'Bạn cần?', correct: false }, { text: 'Bạn làm gì?', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ you pass me the salt?', correctAnswer: 'Could', options: [] },
              { type: 'SELECT', question: 'Which is a polite request?', correctAnswer: null, options: [{ text: 'I was wondering if', correct: true }, { text: 'Give me', correct: false }, { text: 'Do it now', correct: false }, { text: 'You must', correct: false }] },
              { type: 'ASSIST', question: '"Giúp tôi với" in English?', correctAnswer: 'Help me please', options: [{ text: 'Help me please', correct: true }, { text: 'Help me', correct: false }, { text: 'Can help me', correct: false }, { text: 'Would help me', correct: false }] },
            ],
          },
          {
            title: 'Expressing Emotions',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What does "I\'m over the moon" mean?', correctAnswer: null, options: [{ text: 'Very happy', correct: true }, { text: 'Very sad', correct: false }, { text: 'Very angry', correct: false }, { text: 'Very tired', correct: false }] },
              { type: 'ASSIST', question: 'What does "on cloud nine" mean?', correctAnswer: 'Rất hạnh phúc', options: [{ text: 'Rất hạnh phúc', correct: true }, { text: 'Rất buồn', correct: false }, { text: 'Rất lo', correct: false }, { text: 'Rất giận', correct: false }] },
              { type: 'TYPE', question: 'Complete: She was _ the moon about the news.', correctAnswer: 'over', options: [] },
              { type: 'SELECT', question: 'Which means "very angry"?', correctAnswer: null, options: [{ text: 'Furious', correct: true }, { text: 'Happy', correct: false }, { text: 'Excited', correct: false }, { text: 'Anxious', correct: false }] },
              { type: 'ASSIST', question: '"Rất thất vọng" in English?', correctAnswer: 'Very disappointed', options: [{ text: 'Very disappointed', correct: true }, { text: 'Very surprised', correct: false }, { text: 'Very excited', correct: false }, { text: 'Very happy', correct: false }] },
            ],
          },
          {
            title: 'Expressions Review',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'What does "sounds good" mean?', correctAnswer: null, options: [{ text: 'I agree', correct: true }, { text: 'I disagree', correct: false }, { text: 'I\'m not sure', correct: false }, { text: 'Maybe', correct: false }] },
              { type: 'ASSIST', question: 'What does "no problem" mean?', correctAnswer: 'Không sao', options: [{ text: 'Không sao', correct: true }, { text: 'Có vấn đề', correct: false }, { text: 'Có lỗi', correct: false }, { text: 'Không tốt', correct: false }] },
              { type: 'TYPE', question: 'Complete: _ problem, I can help.', correctAnswer: 'No', options: [] },
              { type: 'SELECT', question: 'Which means "not bad"?', correctAnswer: null, options: [{ text: 'Not bad', correct: true }, { text: 'Very bad', correct: false }, { text: 'So bad', correct: false }, { text: 'Too bad', correct: false }] },
              { type: 'ASSIST', question: '"Tôi hiểu rồi" in English?', correctAnswer: 'I see', options: [{ text: 'I see', correct: true }, { text: 'I know', correct: false }, { text: 'I think', correct: false }, { text: 'I believe', correct: false }] },
            ],
          },
        ],
      },
      {
        title: 'Culture & Society',
        description: 'Understanding English-speaking cultures',
        order: 2,
        lessons: [
          {
            title: 'British Culture',
            order: 0,
            challenges: [
              { type: 'SELECT', question: 'What is "tea time"?', correctAnswer: null, options: [{ text: 'Afternoon drink break', correct: true }, { text: 'Breakfast time', correct: false }, { text: 'Dinner time', correct: false }, { text: 'Midnight snack', correct: false }] },
              { type: 'ASSIST', question: 'What does " queue" mean?', correctAnswer: 'Xếp hàng', options: [{ text: 'Xếp hàng', correct: true }, { text: 'Đi xếp', correct: false }, { text: 'Hàng đợi', correct: false }, { text: 'Đợi', correct: false }] },
              { type: 'TYPE', question: 'Complete: Please _ up for the bus.', correctAnswer: 'queue', options: [] },
              { type: 'SELECT', question: 'Which is a British tradition?', correctAnswer: null, options: [{ text: 'Afternoon tea', correct: true }, { text: 'Siesta', correct: false }, { text: 'Midnight mass', correct: false }, { text: 'Lunch break', correct: false }] },
              { type: 'ASSIST', question: '"Nói lái" in British English?', correctAnswer: 'British accent', options: [{ text: 'British accent', correct: true }, { text: 'American accent', correct: false }, { text: 'Australian accent', correct: false }, { text: 'Irish accent', correct: false }] },
            ],
          },
          {
            title: 'American Culture',
            order: 1,
            challenges: [
              { type: 'SELECT', question: 'What is "tipping" culture?', correctAnswer: null, options: [{ text: 'Leaving extra money for service', correct: true }, { text: 'Making a toast', correct: false }, { text: 'Saying goodbye', correct: false }, { text: 'Starting a conversation', correct: false }] },
              { type: 'ASSIST', question: 'What does "small talk" mean?', correctAnswer: 'Trò chuyện nhỏ', options: [{ text: 'Trò chuyện nhỏ', correct: true }, { text: 'Nói chuyện lớn', correct: false }, { text: 'Tranh luận', correct: false }, { text: 'Thảo luận', correct: false }] },
              { type: 'TYPE', question: 'Complete: Let\'s make some _.', correctAnswer: 'small talk', options: [] },
              { type: 'SELECT', question: 'Which is American fast food?', correctAnswer: null, options: [{ text: 'Burger', correct: true }, { text: 'Sushi', correct: false }, { text: 'Pasta', correct: false }, { text: 'Curry', correct: false }] },
              { type: 'ASSIST', question: '"Quốc gia" in American culture?', correctAnswer: 'Nation', options: [{ text: 'Nation', correct: true }, { text: 'Country', correct: false }, { text: 'State', correct: false }, { text: 'Land', correct: false }] },
            ],
          },
          {
            title: 'Social Customs',
            order: 2,
            challenges: [
              { type: 'SELECT', question: 'What does "personal space" mean?', correctAnswer: null, options: [{ text: 'Physical distance comfort zone', correct: true }, { text: 'Living space', correct: false }, { text: 'Office space', correct: false }, { text: 'Parking space', correct: false }] },
              { type: 'ASSIST', question: 'What does "punctuality" mean?', correctAnswer: 'Đúng giờ', options: [{ text: 'Đúng giờ', correct: true }, { text: 'Trễ giờ', correct: false }, { text: 'Nhanh', correct: false }, { text: 'Chậm', correct: false }] },
              { type: 'TYPE', question: 'Complete: Being _ is important.', correctAnswer: 'punctual', options: [] },
              { type: 'SELECT', question: 'Which is a social custom?', correctAnswer: null, options: [{ text: 'Shaking hands', correct: true }, { text: 'Bowing', correct: false }, { text: 'Kissing', correct: false }, { text: 'Hugging', correct: false }] },
              { type: 'ASSIST', question: '"Thân mật" in English?', correctAnswer: 'Intimate', options: [{ text: 'Intimate', correct: true }, { text: 'Distant', correct: false }, { text: 'Formal', correct: false }, { text: 'Casual', correct: false }] },
            ],
          },
          {
            title: 'Festivals & Holidays',
            order: 3,
            challenges: [
              { type: 'SELECT', question: 'What is "Thanksgiving"?', correctAnswer: null, options: [{ text: 'US holiday in November', correct: true }, { text: 'Christmas', correct: false }, { text: 'Easter', correct: false }, { text: 'Halloween', correct: false }] },
              { type: 'ASSIST', question: 'What does "trick or treat" mean?', correctAnswer: 'Kẹo hay bị phá', options: [{ text: 'Kẹo hay bị phá', correct: true }, { text: 'Ăn kẹo', correct: false }, { text: 'Trang trí', correct: false }, { text: 'Ăn tối', correct: false }] },
              { type: 'TYPE', question: 'Complete: Happy _!', correctAnswer: 'Thanksgiving', options: [] },
              { type: 'SELECT', question: 'Which is a December holiday?', correctAnswer: null, options: [{ text: 'Christmas', correct: true }, { text: 'Easter', correct: false }, { text: 'Thanksgiving', correct: false }, { text: 'Halloween', correct: false }] },
              { type: 'ASSIST', question: '"Ngày lễ" in English?', correctAnswer: 'Holiday', options: [{ text: 'Holiday', correct: true }, { text: 'Festival', correct: false }, { text: 'Celebration', correct: false }, { text: 'Party', correct: false }] },
            ],
          },
          {
            title: 'Culture Test',
            order: 4,
            challenges: [
              { type: 'SELECT', question: 'What does "cheers" mean in British English?', correctAnswer: null, options: [{ text: 'Thanks / Goodbye', correct: true }, { text: 'Celebrate', correct: false }, { text: 'Applause', correct: false }, { text: 'Hello', correct: false }] },
              { type: 'ASSIST', question: 'What does "mate" mean?', correctAnswer: 'Bạn', options: [{ text: 'Bạn', correct: true }, { text: 'Đồng nghiệp', correct: false }, { text: 'Bạn trai', correct: false }, { text: 'Người yêu', correct: false }] },
              { type: 'TYPE', question: 'Complete: Cheers, _!', correctAnswer: 'mate', options: [] },
              { type: 'SELECT', question: 'Which is British slang?', correctAnswer: null, options: [{ text: 'Brilliant', correct: true }, { text: 'Awesome', correct: false }, { text: 'Cool', correct: false }, { text: 'Amazing', correct: false }] },
              { type: 'ASSIST', question: '"Bữa tiệc" in English?', correctAnswer: 'Party', options: [{ text: 'Party', correct: true }, { text: 'Celebration', correct: false }, { text: 'Festival', correct: false }, { text: 'Gathering', correct: false }] },
            ],
          },
        ],
      },
    ],
  },
];


const seedDuolingo = async () => {
  const courseCount = await Course.countDocuments();
  if (courseCount > 0 && process.env.FORCE_SEED !== 'true') {
    console.log('ℹ️ Duolingo courses already exist. Skipping seeding to prevent overwriting existing data. (Use FORCE_SEED=true to override)');
    return;
  }

  console.log('🌱 Seeding Duolingo data...');

  await ChallengeOption.deleteMany({});
  await Challenge.deleteMany({});
  await Lesson.deleteMany({});
  await Unit.deleteMany({});
  await Course.deleteMany({});
  console.log('🧹 Cleaned up existing data.');

  let totalCourses = 0, totalUnits = 0, totalLessons = 0, totalChallenges = 0;

  for (const course of courseData) {
    const createdCourse = await Course.create(course.course);
    totalCourses++;

    for (const unit of course.units || []) {
      const createdUnit = await Unit.create({ ...unit, course: createdCourse._id });
      totalUnits++;

      for (const lesson of unit.lessons || []) {
        const createdLesson = await Lesson.create({ ...lesson, unit: createdUnit._id });
        totalLessons++;

        for (const challenge of lesson.challenges || []) {
          // Embed options directly into Challenge document (no separate ChallengeOption collection)
          await Challenge.create({ ...challenge, lesson: createdLesson._id });
          totalChallenges++;
        }
      }
    }
  }

  console.log(`✅ Seeded ${totalCourses} courses, ${totalUnits} units, ${totalLessons} lessons, ${totalChallenges} challenges.`);
  console.log('✅ Duolingo seeding completed successfully!');
};

module.exports = { seedDuolingo };
