import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseBulkText, BULK_FORMATS } from '../utils/bulkParser.js';

describe('Bulk Parser Utilities', () => {
  test('returns error for empty input', () => {
    const res = parseBulkText('');
    assert.equal(res.cards.length, 0);
    assert.equal(res.error, 'Chưa có dữ liệu nào để xử lý.');
  });

  describe('2-field format: front | back', () => {
    test('parses simple 2-field lines', () => {
      const input = `apple | quả táo\nbanana | quả chuối`;
      const res = parseBulkText(input, BULK_FORMATS.TWO_FIELD);
      assert.equal(res.cards.length, 2);
      assert.deepEqual(res.cards[0], { front: 'apple', back: 'quả táo' });
      assert.deepEqual(res.cards[1], { front: 'banana', back: 'quả chuối' });
      assert.equal(res.invalidLines.length, 0);
      assert.equal(res.error, '');
    });

    test('preserves extra pipes in definition for 2-field format', () => {
      const input = `term | part 1 | part 2`;
      const res = parseBulkText(input, BULK_FORMATS.TWO_FIELD);
      assert.equal(res.cards.length, 1);
      assert.equal(res.cards[0].front, 'term');
      assert.equal(res.cards[0].back, 'part 1 | part 2');
    });

    test('tracks invalid line numbers accurately', () => {
      const input = `valid1 | ok1\ninvalid line without separator\nvalid2 | ok2\n  | missing front`;
      const res = parseBulkText(input, BULK_FORMATS.TWO_FIELD);
      assert.equal(res.cards.length, 2);
      assert.deepEqual(res.invalidLines, [2, 4]);
      assert.ok(res.error.includes('dòng: 2, 4'));
    });
  });

  describe('3-field format: front | back | example', () => {
    test('parses front, back, and optional example', () => {
      const input = `
        apple | quả táo | I eat an apple
        orange | quả cam
      `;
      const res = parseBulkText(input, BULK_FORMATS.THREE_FIELD);
      assert.equal(res.cards.length, 2);
      assert.deepEqual(res.cards[0], {
        front: 'apple',
        back: 'quả táo',
        example: 'I eat an apple',
      });
      assert.deepEqual(res.cards[1], {
        front: 'orange',
        back: 'quả cam',
      });
    });

    test('handles pipes inside example field', () => {
      const input = `term | def | ex: A | B`;
      const res = parseBulkText(input, BULK_FORMATS.THREE_FIELD);
      assert.equal(res.cards[0].example, 'ex: A | B');
    });
  });

  describe('4-field format: front | back | pronunciation | example', () => {
    test('parses 4 fields with pronunciation and example', () => {
      const input = `hello | xin chào | /ˈhɛloʊ/ | Hello world!`;
      const res = parseBulkText(input, BULK_FORMATS.FOUR_FIELD);
      assert.equal(res.cards.length, 1);
      assert.deepEqual(res.cards[0], {
        front: 'hello',
        back: 'xin chào',
        pronunciation: '/ˈhɛloʊ/',
        example: 'Hello world!',
      });
    });

    test('handles missing optional pronunciation or example', () => {
      const input = `word | từ |  | example only`;
      const res = parseBulkText(input, BULK_FORMATS.FOUR_FIELD);
      assert.equal(res.cards.length, 1);
      assert.equal(res.cards[0].front, 'word');
      assert.equal(res.cards[0].back, 'từ');
      assert.equal(res.cards[0].pronunciation, undefined);
      assert.equal(res.cards[0].example, 'example only');
    });
  });
});
