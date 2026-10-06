/* questions.js — the quiz question bank (frozen schema from CONTRACT.md).
 * 24 questions ordered easiest -> hardest: 8 band A, 10 band B, 6 band C.
 * Classic script, attaches to window.DC.questions.
 */
(function (DC) {
  'use strict';

  DC.questions = [
    /* ---------------- Band A (easiest) ---------------- */
    {
      id: 'q1',
      band: 'A',
      skill: 'number-sense',
      type: 'choice',
      prompt: 'Which number is the biggest: 3, 8, 5, or 2?',
      promptSpeech: 'Which number is the biggest: three, eight, five, or two?',
      promptSimple: 'Which is the biggest: 3, 8, 5, or 2?',
      promptSimpleSpeech: 'Which is the biggest: three, eight, five, or two?',
      choices: [
        { label: '3', value: 3 },
        { label: '8', value: 8 },
        { label: '5', value: 5 },
        { label: '2', value: 2 }
      ],
      answer: 8,
      scaffold: {
        kind: 'numberline',
        data: { min: 1, max: 10, step: 1, marks: [2, 3, 5, 8], highlight: 8 }
      }
    },
    {
      id: 'q2',
      band: 'A',
      skill: 'facts',
      type: 'choice',
      prompt: 'What is 2 + 3?',
      promptSpeech: 'What is two plus three?',
      promptSimple: 'What is 2 plus 3?',
      promptSimpleSpeech: 'What is two plus three?',
      choices: [
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
        { label: '3', value: 3 }
      ],
      answer: 5,
      hint: 'Start at 2 and count on three more: 3, 4, 5.',
      factRef: 'add-10',
      scaffold: {
        kind: 'dots',
        data: { groups: [{ count: 2, label: '2' }, { count: 3, label: '3' }], op: '+' }
      }
    },
    {
      id: 'q3',
      band: 'A',
      skill: 'number-sense',
      type: 'choice',
      prompt: 'Count the dots. How many are there?',
      promptSpeech: 'Count the dots. How many are there?',
      promptSimple: 'Count the dots. How many?',
      choices: [
        { label: '6', value: 6 },
        { label: '7', value: 7 },
        { label: '8', value: 8 },
        { label: '9', value: 9 }
      ],
      answer: 7,
      scaffold: {
        kind: 'dots',
        data: { groups: [{ count: 7 }] }
      }
    },
    {
      id: 'q4',
      band: 'A',
      skill: 'place-value',
      type: 'choice',
      prompt: 'In the number 47, what is the tens digit?',
      promptSpeech: 'In the number forty seven, what is the tens digit?',
      promptSimple: 'What is the tens digit of 47?',
      promptSimpleSpeech: 'What is the tens digit of forty seven?',
      choices: [
        { label: '4', value: 4 },
        { label: '7', value: 7 },
        { label: '47', value: 47 },
        { label: '11', value: 11 }
      ],
      answer: 4,
      scaffold: {
        kind: 'placevalue',
        data: { value: 47, places: ['tens', 'ones'] }
      }
    },
    {
      id: 'q5',
      band: 'A',
      skill: 'facts',
      type: 'entry',
      prompt: 'What is 5 + 4?',
      promptSpeech: 'What is five plus four?',
      promptSimple: 'What is 5 plus 4?',
      promptSimpleSpeech: 'What is five plus four?',
      answer: 9,
      tolerance: 0.0001,
      hint: 'Use the number bond: the whole is 9, and the two parts are 5 and 4.',
      factRef: 'add-10',
      scaffold: {
        kind: 'numberbond',
        data: { whole: 9, parts: [5, 4] }
      }
    },
    {
      id: 'q6',
      band: 'A',
      skill: 'time',
      type: 'choice',
      prompt: 'The clock shows 3:00. What time will it be in one hour?',
      promptSpeech: 'The clock shows three o\'clock. What time will it be in one hour?',
      promptSimple: 'It is 3:00. What time is it in one hour?',
      promptSimpleSpeech: 'It is three o\'clock. What time is it in one hour?',
      choices: [
        { label: '2:00', value: '2:00' },
        { label: '3:00', value: '3:00' },
        { label: '4:00', value: '4:00' },
        { label: '5:00', value: '5:00' }
      ],
      answer: '4:00',
      hint: 'One hour later means the hour number goes up by one.',
      scaffold: {
        kind: 'numberline',
        data: { min: 1, max: 12, step: 1, marks: [3, 4], highlight: 4 }
      }
    },
    {
      id: 'q7',
      band: 'A',
      skill: 'money',
      type: 'choice',
      prompt: 'A pencil costs 50 cents. You pay with a 1 dollar coin. How much change do you get?',
      promptSpeech: 'A pencil costs fifty cents. You pay with a one dollar coin. How much change do you get?',
      promptSimple: 'A pencil costs 50 cents. You pay with 1 dollar. How much change?',
      promptSimpleSpeech: 'A pencil costs fifty cents. You pay with one dollar. How much change?',
      choices: [
        { label: '25 cents', value: 25 },
        { label: '50 cents', value: 50 },
        { label: '75 cents', value: 75 },
        { label: '100 cents', value: 100 }
      ],
      answer: 50,
      factRef: 'add-10',
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 100, step: 10, marks: [50, 100], highlight: 50 }
      }
    },
    {
      id: 'q8',
      band: 'A',
      skill: 'fractions',
      type: 'choice',
      prompt: 'A pizza is cut into 4 equal slices. You eat 1 slice. What fraction of the pizza did you eat?',
      promptSpeech: 'A pizza is cut into four equal slices. You eat one slice. What fraction of the pizza did you eat?',
      promptSimple: 'A pizza has 4 equal slices. You eat 1. What fraction did you eat?',
      promptSimpleSpeech: 'A pizza has four equal slices. You eat one. What fraction did you eat?',
      choices: [
        { label: '1/4', value: '1/4' },
        { label: '1/2', value: '1/2' },
        { label: '3/4', value: '3/4' },
        { label: '1/3', value: '1/3' }
      ],
      answer: '1/4',
      hint: 'The bottom number is how many equal pieces in all; the top is how many you took.',
      scaffold: {
        kind: 'fractionbar',
        data: { numerator: 1, denominator: 4, shaded: 1 }
      }
    },

    /* ---------------- Band B ---------------- */
    {
      id: 'q9',
      band: 'B',
      skill: 'facts',
      type: 'entry',
      prompt: 'What is 6 × 5?',
      promptSpeech: 'What is six times five?',
      promptSimple: 'What is 6 times 5?',
      promptSimpleSpeech: 'What is six times five?',
      answer: 30,
      tolerance: 0.0001,
      factRef: 'times-5',
      scaffold: {
        kind: 'dots',
        data: {
          groups: [
            { count: 5 }, { count: 5 }, { count: 5 },
            { count: 5 }, { count: 5 }, { count: 5 }
          ],
          op: '×'
        }
      }
    },
    {
      id: 'q10',
      band: 'B',
      skill: 'number-sense',
      type: 'choice',
      prompt: 'Which number is closer to 100: 89 or 112?',
      promptSpeech: 'Which number is closer to one hundred: eighty nine or one hundred twelve?',
      promptSimple: 'Which is closer to 100: 89 or 112?',
      promptSimpleSpeech: 'Which is closer to one hundred: eighty nine or one hundred twelve?',
      choices: [
        { label: '89', value: 89 },
        { label: '112', value: 112 },
        { label: 'They are the same distance', value: 'same' }
      ],
      answer: 89,
      hint: '89 is 11 away from 100; 112 is 12 away.',
      scaffold: {
        kind: 'numberline',
        data: { min: 80, max: 120, step: 10, marks: [89, 100, 112], highlight: 89 }
      }
    },
    {
      id: 'q11',
      band: 'B',
      skill: 'place-value',
      type: 'entry',
      prompt: 'What is the value of the digit 7 in 372?',
      promptSpeech: 'What is the value of the digit seven in three hundred seventy two?',
      promptSimple: 'What is the value of 7 in 372?',
      promptSimpleSpeech: 'What is the value of seven in three hundred seventy two?',
      answer: 70,
      tolerance: 0.0001,
      hint: 'The 7 sits in the tens place, so its value is 7 tens.',
      scaffold: {
        kind: 'placevalue',
        data: { value: 372, places: ['hundreds', 'tens', 'ones'] }
      }
    },
    {
      id: 'q12',
      band: 'B',
      skill: 'word-problem',
      type: 'choice',
      prompt: 'Maya has 12 stickers. She gives 4 to a friend, then buys 5 more. How many stickers does she have now?',
      promptSpeech: 'Maya has twelve stickers. She gives four to a friend, then buys five more. How many stickers does she have now?',
      promptSimple: 'Maya has 12 stickers. She gives 4 away, then buys 5 more. How many now?',
      promptSimpleSpeech: 'Maya has twelve stickers. She gives four away, then buys five more. How many now?',
      choices: [
        { label: '11', value: 11 },
        { label: '12', value: 12 },
        { label: '13', value: 13 },
        { label: '21', value: 21 }
      ],
      answer: 13,
      hint: 'Do it in two steps: take away 4 first, then add 5.',
      steps: [
        'Start with 12 stickers.',
        'She gives away 4: 12 − 4 = 8.',
        'She buys 5 more: 8 + 5 = 13.'
      ],
      factRef: 'sub-20',
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 20, step: 1, marks: [12, 8, 13], highlight: 13 }
      }
    },
    {
      id: 'q13',
      band: 'B',
      skill: 'time',
      type: 'choice',
      prompt: 'The bus leaves at 8:15 and the ride takes 30 minutes. What time do you arrive?',
      promptSpeech: 'The bus leaves at eight fifteen and the ride takes thirty minutes. What time do you arrive?',
      promptSimple: 'The bus leaves at 8:15. The ride is 30 minutes. When do you arrive?',
      promptSimpleSpeech: 'The bus leaves at eight fifteen. The ride is thirty minutes. When do you arrive?',
      choices: [
        { label: '8:30', value: '8:30' },
        { label: '8:45', value: '8:45' },
        { label: '9:00', value: '9:00' },
        { label: '9:15', value: '9:15' }
      ],
      answer: '8:45',
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 60, step: 5, marks: [15, 45], highlight: 45 }
      }
    },
    {
      id: 'q14',
      band: 'B',
      skill: 'estimation',
      type: 'choice',
      prompt: 'About how many books are on 3 shelves if each shelf holds about 20 books?',
      promptSpeech: 'About how many books are on three shelves if each shelf holds about twenty books?',
      promptSimple: 'There are 3 shelves. Each holds about 20 books. About how many books in all?',
      promptSimpleSpeech: 'There are three shelves. Each holds about twenty books. About how many books in all?',
      choices: [
        { label: 'about 40', value: 40 },
        { label: 'about 60', value: 60 },
        { label: 'about 80', value: 80 },
        { label: 'about 23', value: 23 }
      ],
      answer: 60,
      factRef: 'add-20',
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 80, step: 10, marks: [20, 40, 60], highlight: 60 }
      }
    },
    {
      id: 'q15',
      band: 'B',
      skill: 'facts',
      type: 'choice',
      prompt: 'Which doubles fact shows 8 + 8?',
      promptSpeech: 'Which doubles fact shows eight plus eight?',
      promptSimple: 'Which doubles fact is 8 + 8?',
      promptSimpleSpeech: 'Which doubles fact is eight plus eight?',
      choices: [
        { label: '8 + 8 = 14', value: 14 },
        { label: '8 + 8 = 15', value: 15 },
        { label: '8 + 8 = 16', value: 16 },
        { label: '8 + 8 = 17', value: 17 }
      ],
      answer: 16,
      hint: 'A doubles fact has two parts that are the same. Double 8 means 8 and 8.',
      factRef: 'doubles',
      scaffold: {
        kind: 'numberbond',
        data: { whole: 16, parts: [8, 8] }
      }
    },
    {
      id: 'q16',
      band: 'B',
      skill: 'fractions',
      type: 'entry',
      prompt: 'A chocolate bar has 8 equal pieces. You eat 3. What fraction of the bar is left?',
      promptSpeech: 'A chocolate bar has eight equal pieces. You eat three. What fraction of the bar is left?',
      promptSimple: 'A chocolate bar has 8 pieces. You eat 3. What fraction is left?',
      promptSimpleSpeech: 'A chocolate bar has eight pieces. You eat three. What fraction is left?',
      answer: ['5/8', '0.625'],
      scaffold: {
        kind: 'fractionbar',
        data: { numerator: 5, denominator: 8, shaded: 5 }
      }
    },
    {
      id: 'q17',
      band: 'B',
      skill: 'money',
      type: 'entry',
      prompt: 'A snack costs 1 dollar 25 cents and a juice costs 75 cents. How much do they cost together, in cents?',
      promptSpeech: 'A snack costs one dollar and twenty five cents and a juice costs seventy five cents. How much do they cost together, in cents?',
      promptSimple: 'A snack costs 1 dollar 25 cents. A juice costs 75 cents. What is the total in cents?',
      promptSimpleSpeech: 'A snack costs one dollar twenty five cents. A juice costs seventy five cents. What is the total in cents?',
      answer: 200,
      tolerance: 0.0001,
      factRef: 'add-20',
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 250, step: 25, marks: [125, 200], highlight: 200 }
      }
    },
    {
      id: 'q18',
      band: 'B',
      skill: 'word-problem',
      type: 'choice',
      prompt: 'A class has 24 students. They sit in rows of 4. How many rows are there?',
      promptSpeech: 'A class has twenty four students. They sit in rows of four. How many rows are there?',
      promptSimple: 'There are 24 students. They sit in rows of 4. How many rows?',
      promptSimpleSpeech: 'There are twenty four students. They sit in rows of four. How many rows?',
      choices: [
        { label: '4', value: 4 },
        { label: '5', value: 5 },
        { label: '6', value: 6 },
        { label: '7', value: 7 }
      ],
      answer: 6,
      hint: 'Count how many groups of 4 fit into 24.',
      steps: [
        'There are 24 students in all.',
        'Each row holds 4 students.',
        'Split 24 into groups of 4: 4, 8, 12, 16, 20, 24 — that is 6 rows.'
      ],
      scaffold: {
        kind: 'dots',
        data: {
          groups: [
            { count: 4 }, { count: 4 }, { count: 4 },
            { count: 4 }, { count: 4 }, { count: 4 }
          ],
          op: '÷'
        }
      }
    },

    /* ---------------- Band C (hardest) ---------------- */
    {
      id: 'q19',
      band: 'C',
      skill: 'place-value',
      type: 'choice',
      prompt: 'What number is 4 thousands, 3 hundreds, 2 tens, and 6 ones?',
      promptSpeech: 'What number is four thousands, three hundreds, two tens, and six ones?',
      promptSimple: 'What number has 4 thousands, 3 hundreds, 2 tens, 6 ones?',
      promptSimpleSpeech: 'What number has four thousands, three hundreds, two tens, six ones?',
      choices: [
        { label: '4326', value: 4326 },
        { label: '4362', value: 4362 },
        { label: '43206', value: 43206 },
        { label: '40326', value: 40326 }
      ],
      answer: 4326,
      scaffold: {
        kind: 'placevalue',
        data: { value: 4326, places: ['thousands', 'hundreds', 'tens', 'ones'] }
      }
    },
    {
      id: 'q20',
      band: 'C',
      skill: 'estimation',
      type: 'entry',
      prompt: 'Round 487 to the nearest hundred.',
      promptSpeech: 'Round four hundred eighty seven to the nearest hundred.',
      promptSimple: 'Round 487 to the nearest 100.',
      promptSimpleSpeech: 'Round four hundred eighty seven to the nearest hundred.',
      answer: 500,
      tolerance: 0.0001,
      hint: 'Is 487 closer to 400 or to 500? Look at where it sits between the two hundreds.',
      factRef: 'rounding',
      scaffold: {
        kind: 'numberline',
        data: { min: 400, max: 500, step: 10, marks: [450, 487, 500], highlight: 500 }
      }
    },
    {
      id: 'q21',
      band: 'C',
      skill: 'fractions',
      type: 'choice',
      prompt: 'Which fraction is equal to 1/2?',
      promptSpeech: 'Which fraction is equal to one half?',
      promptSimple: 'Which fraction equals 1/2?',
      promptSimpleSpeech: 'Which fraction equals one half?',
      choices: [
        { label: '2/4', value: '2/4' },
        { label: '2/3', value: '2/3' },
        { label: '3/4', value: '3/4' },
        { label: '1/3', value: '1/3' }
      ],
      answer: '2/4',
      scaffold: {
        kind: 'fractionbar',
        data: { numerator: 2, denominator: 4, shaded: 2 }
      }
    },
    {
      id: 'q22',
      band: 'C',
      skill: 'word-problem',
      type: 'entry',
      prompt: 'A baker makes 6 trays with 12 cookies each. She sells 40 cookies. How many cookies are left?',
      promptSpeech: 'A baker makes six trays with twelve cookies each. She sells forty cookies. How many cookies are left?',
      promptSimple: 'A baker makes 6 trays of 12 cookies. She sells 40. How many are left?',
      promptSimpleSpeech: 'A baker makes six trays of twelve cookies. She sells forty. How many are left?',
      answer: 32,
      tolerance: 0.0001,
      hint: 'First find the total, then take away what she sold.',
      steps: [
        'Find the total cookies: 6 trays of 12 is 12 + 12 + 12 + 12 + 12 + 12 = 72.',
        'She sells 40 cookies: 72 − 40 = 32.'
      ],
      scaffold: {
        kind: 'dots',
        data: {
          groups: [
            { count: 12 }, { count: 12 }, { count: 12 },
            { count: 12 }, { count: 12 }, { count: 12 }
          ],
          op: '×'
        }
      }
    },
    {
      id: 'q23',
      band: 'C',
      skill: 'time',
      type: 'choice',
      prompt: 'A movie starts at 2:40 and lasts 1 hour 35 minutes. What time does it end?',
      promptSpeech: 'A movie starts at two forty and lasts one hour and thirty five minutes. What time does it end?',
      promptSimple: 'A movie starts at 2:40. It lasts 1 hour 35 minutes. When does it end?',
      promptSimpleSpeech: 'A movie starts at two forty. It lasts one hour thirty five minutes. When does it end?',
      choices: [
        { label: '3:75', value: '3:75' },
        { label: '4:05', value: '4:05' },
        { label: '4:15', value: '4:15' },
        { label: '4:25', value: '4:25' }
      ],
      answer: '4:15',
      steps: [
        'Start at 2:40.',
        'Add 1 hour to reach 3:40.',
        'Add 20 minutes to reach 4:00, then 15 more to reach 4:15.'
      ],
      scaffold: {
        kind: 'numberline',
        data: { min: 0, max: 120, step: 10, marks: [40, 95], highlight: 95 }
      }
    },
    {
      id: 'q24',
      band: 'C',
      skill: 'money',
      type: 'entry',
      prompt: 'Three friends share a 12 dollar pizza equally and together buy a 6 dollar salad. How much does each friend pay?',
      promptSpeech: 'Three friends share a twelve dollar pizza equally and together buy a six dollar salad. How much does each friend pay?',
      promptSimple: 'Three friends share a 12 dollar pizza and a 6 dollar salad. How much does each pay?',
      promptSimpleSpeech: 'Three friends share a twelve dollar pizza and a six dollar salad. How much does each pay?',
      answer: 6,
      tolerance: 0.0001,
      hint: 'Add the pizza and salad first, then share that total three ways.',
      steps: [
        'The pizza costs 12 dollars.',
        'Add the 6 dollar salad: 12 + 6 = 18 dollars.',
        'Split 18 dollars three ways: 18 ÷ 3 = 6 dollars each.'
      ],
      scaffold: {
        kind: 'numberbond',
        data: { whole: 18, parts: [6, 6, 6] }
      }
    }
  ];
})(window.DC);
