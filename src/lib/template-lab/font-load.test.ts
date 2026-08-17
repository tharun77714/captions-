/* eslint-disable @typescript-eslint/no-unused-vars */
import { test } from 'node:test';
import assert from 'node:assert';

// Mocking document to test the font loading logic conceptually
function createMockDocument(
  stylesheetLoadTime: number,
  interReturns: unknown[],
  notoReturns: unknown[],
  notoSerifReturns: unknown[],
  checkResult: boolean
) {
  let stylesheetOnLoad: (() => void) | null = null;
  let stylesheetOnError: (() => void) | null = null;
  
  const link = {
    set onload(fn: () => void) { stylesheetOnLoad = fn; },
    set onerror(fn: () => void) { stylesheetOnError = fn; },
  };

  if (stylesheetLoadTime >= 0) {
    setTimeout(() => {
      if (stylesheetOnLoad) stylesheetOnLoad();
    }, stylesheetLoadTime);
  } else {
    setTimeout(() => {
      if (stylesheetOnError) stylesheetOnError();
    }, Math.abs(stylesheetLoadTime));
  }

  const documentMock = {
    fonts: {
      load: async (font: string, _text: string) => {
        if (font.includes('Inter')) return interReturns;
        if (font.includes('Sans')) return notoReturns;
        return notoSerifReturns;
      },
      check: (_font: string) => checkResult,
    }
  };

  return { link, documentMock };
}

test('Font stylesheet success', async () => {
  const { link, documentMock } = createMockDocument(10, [{}], [{}], [{}], true);
  
  const result = await new Promise((resolve) => {
    let status = 'loading';
    const checkFonts = async () => {
      try {
        await new Promise<void>((res, rej) => {
          link.onload = res;
          link.onerror = () => rej(new Error('fail'));
          setTimeout(() => rej(new Error('timeout')), 50);
        });
        const i = await documentMock.fonts.load('Inter', 'test');
        const s = await documentMock.fonts.load('Sans', 'test');
        const r = await documentMock.fonts.load('Serif', 'test');
        if (i.length === 0 || s.length === 0 || r.length === 0) throw new Error('empty');
        if (!documentMock.fonts.check('Inter')) throw new Error('check fail');
        status = 'ready';
      } catch (e) {
        status = 'failed';
      }
      resolve(status);
    };
    checkFonts();
  });
  assert.strictEqual(result, 'ready');
});

test('Stylesheet timeout', async () => {
  const { link, documentMock } = createMockDocument(100, [{}], [{}], [{}], true);
  const result = await new Promise((resolve) => {
    let status = 'loading';
    const checkFonts = async () => {
      try {
        await new Promise<void>((res, rej) => {
          link.onload = res;
          setTimeout(() => rej(new Error('timeout')), 10);
        });
        status = 'ready';
      } catch (e) {
        status = 'failed';
      }
      resolve(status);
    };
    checkFonts();
  });
  assert.strictEqual(result, 'failed');
});

test('Empty document.fonts.load result', async () => {
  const { link, documentMock } = createMockDocument(10, [], [{}], [{}], true); // Inter fails
  const result = await new Promise((resolve) => {
    let status = 'loading';
    const checkFonts = async () => {
      try {
        await new Promise<void>((res) => setTimeout(res, 10)); // pretend css loaded
        const i = await documentMock.fonts.load('Inter', 'test');
        if (i.length === 0) throw new Error('empty');
        status = 'ready';
      } catch (e) {
        status = 'failed';
      }
      resolve(status);
    };
    checkFonts();
  });
  assert.strictEqual(result, 'failed');
});

test('Failed document.fonts.check result', async () => {
  const { link, documentMock } = createMockDocument(10, [{}], [{}], [{}], false);
  const result = await new Promise((resolve) => {
    let status = 'loading';
    const checkFonts = async () => {
      try {
        await new Promise<void>((res) => setTimeout(res, 10)); // pretend css loaded
        const i = await documentMock.fonts.load('Inter', 'test');
        if (!documentMock.fonts.check('Inter')) throw new Error('check fail');
        status = 'ready';
      } catch (e) {
        status = 'failed';
      }
      resolve(status);
    };
    checkFonts();
  });
  assert.strictEqual(result, 'failed');
});
