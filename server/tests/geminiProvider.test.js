describe('Gemini provider timeout handling', () => {
  const providerPath = '../src/modules/ai/providers/gemini.provider';
  let mockGenerateContent;

  const loadProvider = (timeoutMs = 5000) => {
    jest.resetModules();
    process.env.GEMINI_API_TIMEOUT_MS = String(timeoutMs);
    mockGenerateContent = jest.fn();

    jest.doMock('@google/genai', () => ({
      GoogleGenAI: jest.fn(() => ({
        models: {
          generateContent: mockGenerateContent,
        },
      })),
    }));

    return require(providerPath);
  };

  afterEach(() => {
    jest.useRealTimers();
    jest.dontMock('@google/genai');
    delete process.env.GEMINI_API_TIMEOUT_MS;
  });

  it('parses structured JSON when Gemini responds before timeout', async () => {
    const provider = loadProvider();
    mockGenerateContent.mockResolvedValueOnce({ text: '{"ok":true}' });

    await expect(provider.generateStructuredData('key', 'prompt', {})).resolves.toEqual({ ok: true });
  });

  it('maps configured timeout to a 504 error', async () => {
    jest.useFakeTimers();
    const provider = loadProvider(5000);
    mockGenerateContent.mockImplementation((_, options) => (
      new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      })
    ));

    const assertion = expect(provider.generateStructuredData('key', 'prompt', {}))
      .rejects
      .toMatchObject({ status: 504 });
    await jest.advanceTimersByTimeAsync(5000);

    await assertion;
  });
});
