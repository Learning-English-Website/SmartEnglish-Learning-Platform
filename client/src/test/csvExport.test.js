import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeCsvField,
  serializeCardsToCsv,
  getSafeCsvFilename,
} from '../utils/csvExport.js';

describe('CSV Export Utilities', () => {
  describe('escapeCsvField', () => {
    test('handles empty / null / undefined values', () => {
      assert.equal(escapeCsvField(null), '');
      assert.equal(escapeCsvField(undefined), '');
      assert.equal(escapeCsvField(''), '');
    });

    test('leaves normal strings unquoted', () => {
      assert.equal(escapeCsvField('hello'), 'hello');
      assert.equal(escapeCsvField('Xin chào thế giới'), 'Xin chào thế giới');
    });

    test('quotes strings with commas', () => {
      assert.equal(escapeCsvField('hello, world'), '"hello, world"');
    });

    test('escapes and quotes strings with double quotes', () => {
      assert.equal(escapeCsvField('He said "hello"'), '"He said ""hello"""');
    });

    test('quotes strings with newlines', () => {
      assert.equal(escapeCsvField('line1\nline2'), '"line1\nline2"');
      assert.equal(escapeCsvField('line1\r\nline2'), '"line1\r\nline2"');
    });
  });

  describe('serializeCardsToCsv', () => {
    test('starts with UTF-8 BOM', () => {
      const csv = serializeCardsToCsv([]);
      assert.ok(csv.startsWith('\uFEFF'));
    });

    test('outputs stable headers', () => {
      const csv = serializeCardsToCsv([]);
      assert.equal(csv, '\uFEFFfront,back,pronunciation,example,note');
    });

    test('serializes rows with all fields and Vietnamese characters', () => {
      const cards = [
        {
          front: 'apple',
          back: 'quả táo',
          pronunciation: '/ˈæp.əl/',
          example: 'I eat an apple.',
          note: 'Noun',
        },
        {
          front: 'break, split',
          back: 'làm vỡ, phân tách',
          pronunciation: '/breɪk/',
          example: 'He said "Careful!"\nIt broke.',
          note: '',
        },
      ];

      const csv = serializeCardsToCsv(cards);
      const lines = csv.slice(1).split('\r\n');

      assert.equal(lines[0], 'front,back,pronunciation,example,note');
      assert.equal(lines[1], 'apple,quả táo,/ˈæp.əl/,I eat an apple.,Noun');
      assert.equal(lines[2], '"break, split","làm vỡ, phân tách",/breɪk/,"He said ""Careful!""\nIt broke.",');
    });

    test('handles missing or partial card fields cleanly', () => {
      const cards = [{ front: 'dog', back: 'chó' }];
      const csv = serializeCardsToCsv(cards);
      const lines = csv.slice(1).split('\r\n');
      assert.equal(lines[1], 'dog,chó,,,');
    });
  });

  describe('getSafeCsvFilename', () => {
    test('returns default when title is empty', () => {
      assert.equal(getSafeCsvFilename(''), 'flashcards.csv');
      assert.equal(getSafeCsvFilename(null), 'flashcards.csv');
      assert.equal(getSafeCsvFilename('   '), 'flashcards.csv');
    });

    test('replaces invalid characters and spaces', () => {
      assert.equal(getSafeCsvFilename('My Set / IELTS: Topic 1'), 'My_Set___IELTS__Topic_1.csv');
      assert.equal(getSafeCsvFilename('Từ vựng 3000'), 'Từ_vựng_3000.csv');
    });
  });
});
