const { GoogleGenAI } = require('@google/genai');

const DEFAULT_AI_TIMEOUT_MS = 60000;
const MIN_AI_TIMEOUT_MS = 5000;
const MAX_AI_TIMEOUT_MS = 180000;

const getConfiguredTimeoutMs = () => {
  const parsed = Number.parseInt(process.env.GEMINI_API_TIMEOUT_MS, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_AI_TIMEOUT_MS;
  return Math.min(Math.max(parsed, MIN_AI_TIMEOUT_MS), MAX_AI_TIMEOUT_MS);
};

const formatTimeout = (timeoutMs) => `${Math.round(timeoutMs / 1000)} giây`;

const createTimeoutError = (timeoutMs) => {
  const err = new Error(`Connection to Gemini API timed out (${formatTimeout(timeoutMs)}).`);
  err.name = 'TimeoutError';
  err.timeoutMs = timeoutMs;
  return err;
};

const runWithTimeout = async (requestFactory, timeoutMs = getConfiguredTimeoutMs()) => {
  const controller = new AbortController();
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = createTimeoutError(timeoutMs);
      reject(timeoutError);
      controller.abort();
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      requestFactory(controller.signal),
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Maps vendor/SDK errors to standard HTTP status codes and user-friendly Vietnamese messages.
 * @param {Error} error - The caught SDK error
 * @returns {{status: number, message: string}}
 */
const mapAiError = (error) => {
  const errorMsg = error.message || '';
  const lowerErrorMsg = errorMsg.toLowerCase();

  if (error.name === 'TimeoutError' || lowerErrorMsg.includes('timeout') || lowerErrorMsg.includes('deadline')) {
    const timeoutMs = error.timeoutMs || getConfiguredTimeoutMs();
    return {
      status: 504,
      message: `Kết nối đến AI bị quá thời gian chờ (${formatTimeout(timeoutMs)}). Vui lòng thử lại sau ít phút hoặc giảm số lượng câu hỏi.`,
    };
  }

  if (
    errorMsg.includes('API_KEY_INVALID') ||
    lowerErrorMsg.includes('key is invalid') ||
    lowerErrorMsg.includes('api key')
  ) {
    return {
      status: 401,
      message: 'Gemini API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình.',
    };
  }

  if (
    errorMsg.includes('RESOURCE_EXHAUSTED') ||
    errorMsg.includes('QUOTA_EXCEEDED') ||
    lowerErrorMsg.includes('quota') ||
    lowerErrorMsg.includes('rate limit')
  ) {
    return {
      status: 429,
      message: 'Key của bạn đã vượt quá giới hạn lượt dùng thử miễn phí của Google.',
    };
  }

  if (
    lowerErrorMsg.includes('safety') ||
    lowerErrorMsg.includes('block') ||
    lowerErrorMsg.includes('candidate was blocked')
  ) {
    return {
      status: 422,
      message: 'Nội dung yêu cầu vi phạm chính sách an toàn của AI.',
    };
  }

  return {
    status: 502,
    message: `Lỗi kết nối từ nhà cung cấp AI: ${errorMsg}`,
  };
};

const wrapProviderError = (error) => {
  const mapped = mapAiError(error);
  const customError = new Error(mapped.message);
  customError.status = mapped.status;
  return customError;
};

/**
 * Generates structured JSON data from Gemini API with a bounded timeout.
 * @param {string} apiKey - Decrypted API key from the user
 * @param {string} prompt - Prompt string
 * @param {object} responseSchema - Expected JSON schema configuration
 * @returns {Promise<object>} - Decoded JSON response from Gemini
 */
exports.generateStructuredData = async (apiKey, prompt, responseSchema) => {
  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = getConfiguredTimeoutMs();

  try {
    const response = await runWithTimeout((signal) => (
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      }, { signal })
    ), timeoutMs);

    if (!response || !response.text) {
      throw new Error('Không nhận được nội dung phản hồi từ AI.');
    }

    return JSON.parse(response.text);
  } catch (error) {
    throw wrapProviderError(error);
  }
};

/**
 * Generates structured chat responses from Gemini API with conversation history.
 * @param {string} apiKey - Gemini API key
 * @param {string} systemInstruction - System rules/instructions
 * @param {Array<object>} contents - Conversation history array (Gemini SDK structure)
 * @param {object} responseSchema - Structured JSON schema
 * @returns {Promise<object>}
 */
exports.generateChatStructuredData = async (apiKey, systemInstruction, contents, responseSchema) => {
  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = getConfiguredTimeoutMs();

  try {
    const response = await runWithTimeout((signal) => (
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      }, { signal })
    ), timeoutMs);

    if (!response || !response.text) {
      throw new Error('Không nhận được nội dung phản hồi từ AI.');
    }

    return JSON.parse(response.text);
  } catch (error) {
    throw wrapProviderError(error);
  }
};

/**
 * Generates raw text response from Gemini API (unstructured) with a bounded timeout.
 * @param {string} apiKey - Gemini API key
 * @param {string} systemInstruction - System rules/instructions
 * @param {Array<object>} contents - Conversation history array (Gemini SDK structure)
 * @returns {Promise<string>}
 */
exports.generateText = async (apiKey, systemInstruction, contents) => {
  const ai = new GoogleGenAI({ apiKey });
  const timeoutMs = getConfiguredTimeoutMs();

  try {
    const response = await runWithTimeout((signal) => (
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
        },
      }, { signal })
    ), timeoutMs);

    if (!response || !response.text) {
      throw new Error('Không nhận được nội dung phản hồi từ AI.');
    }

    return response.text;
  } catch (error) {
    throw wrapProviderError(error);
  }
};
