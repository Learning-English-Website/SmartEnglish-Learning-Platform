const { GoogleGenAI } = require('@google/genai');

/**
 * Maps vendor/SDK errors to standard HTTP status codes and user-friendly Vietnamese messages.
 * @param {Error} error - The caught SDK error
 * @returns {{status: number, message: string}}
 */
const mapAiError = (error) => {
  const errorMsg = error.message || '';
  if (error.name === 'TimeoutError' || errorMsg.toLowerCase().includes('timeout') || errorMsg.toLowerCase().includes('deadline')) {
    return { 
      status: 504, 
      message: "Kết nối đến AI bị quá thời gian chờ (20 giây). Vui lòng thử lại." 
    };
  }
  if (
    errorMsg.includes('API_KEY_INVALID') || 
    errorMsg.toLowerCase().includes('key is invalid') || 
    errorMsg.toLowerCase().includes('api key')
  ) {
    return { 
      status: 401, 
      message: "Gemini API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình." 
    };
  }
  if (
    errorMsg.includes('RESOURCE_EXHAUSTED') || 
    errorMsg.includes('QUOTA_EXCEEDED') || 
    errorMsg.toLowerCase().includes('quota') || 
    errorMsg.toLowerCase().includes('rate limit')
  ) {
    return { 
      status: 429, 
      message: "Key của bạn đã vượt quá giới hạn lượt dùng thử miễn phí của Google." 
    };
  }
  if (
    errorMsg.toLowerCase().includes('safety') || 
    errorMsg.toLowerCase().includes('block') || 
    errorMsg.toLowerCase().includes('candidate was blocked')
  ) {
    return { 
      status: 422, 
      message: "Nội dung yêu cầu vi phạm chính sách an toàn của AI." 
    };
  }
  // Default to Bad Gateway for other provider issues
  return { 
    status: 502, 
    message: `Lỗi kết nối từ nhà cung cấp AI: ${errorMsg}` 
  };
};

/**
 * Generates structured JSON data from Gemini API with a strict 20-second timeout.
 * @param {string} apiKey - Decrypted API key from the user
 * @param {string} prompt - Prompt string
 * @param {object} responseSchema - Expected JSON schema configuration
 * @returns {Promise<object>} - Decoded JSON response from Gemini
 */
exports.generateStructuredData = async (apiKey, prompt, responseSchema) => {
  const ai = new GoogleGenAI({ apiKey });
  
  // AbortController setup for SDK signal support
  const controller = new AbortController();
  const sdkTimeout = setTimeout(() => controller.abort(), 20000);

  // Promise race to ensure a strict 20-second timeout regardless of internal fetch state
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error('Connection to Gemini API timed out (20 seconds).');
      err.name = 'TimeoutError';
      reject(err);
    }, 20000);
  });

  const apiPromise = (async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      }, {
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(sdkTimeout);
    }
  })();

  try {
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!response || !response.text) {
      throw new Error("Không nhận được nội dung phản hồi từ AI.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    const mapped = mapAiError(error);
    const customError = new Error(mapped.message);
    customError.status = mapped.status;
    throw customError;
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
  
  const controller = new AbortController();
  const sdkTimeout = setTimeout(() => controller.abort(), 20000);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error('Connection to Gemini API timed out (20 seconds).');
      err.name = 'TimeoutError';
      reject(err);
    }, 20000);
  });

  const apiPromise = (async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        }
      }, {
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(sdkTimeout);
    }
  })();

  try {
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!response || !response.text) {
      throw new Error("Không nhận được nội dung phản hồi từ AI.");
    }

    return JSON.parse(response.text);
  } catch (error) {
    const mapped = mapAiError(error);
    const customError = new Error(mapped.message);
    customError.status = mapped.status;
    throw customError;
  }
};

/**
 * Generates raw text response from Gemini API (unstructured) with a strict 20-second timeout.
 * @param {string} apiKey - Gemini API key
 * @param {string} systemInstruction - System rules/instructions
 * @param {Array<object>} contents - Conversation history array (Gemini SDK structure)
 * @returns {Promise<string>}
 */
exports.generateText = async (apiKey, systemInstruction, contents) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const controller = new AbortController();
  const sdkTimeout = setTimeout(() => controller.abort(), 20000);

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      const err = new Error('Connection to Gemini API timed out (20 seconds).');
      err.name = 'TimeoutError';
      reject(err);
    }, 20000);
  });

  const apiPromise = (async () => {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
        }
      }, {
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(sdkTimeout);
    }
  })();

  try {
    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!response || !response.text) {
      throw new Error("Không nhận được nội dung phản hồi từ AI.");
    }

    return response.text;
  } catch (error) {
    const mapped = mapAiError(error);
    const customError = new Error(mapped.message);
    customError.status = mapped.status;
    throw customError;
  }
};
