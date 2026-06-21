const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERROR: Thiếu GEMINI_API_KEY.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const testSchema = {
  type: "OBJECT",
  properties: {
    flashcards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          front: { type: "STRING" },
          back: { type: "STRING" },
          pronunciation: { type: "STRING" },
          example: { type: "STRING" },
          difficulty: { type: "INTEGER" }
        },
        required: ["front", "back", "pronunciation", "example", "difficulty"]
      }
    }
  },
  required: ["flashcards"]
};

const tryGenerateWithModel = async (modelName) => {
  console.log(`\nTesting model: '${modelName}'...`);
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Tạo 2 từ vựng tiếng Anh về chủ đề 'Airport' trình độ A2.",
      config: {
        responseMimeType: "application/json",
        responseSchema: testSchema
      }
    });
    console.log(`✅ THÀNH CÔNG với model '${modelName}'!`);
    console.log(response.text);
    return true;
  } catch (error) {
    console.log(`❌ THẤT BẠI với model '${modelName}': ${error.message}`);
    return false;
  }
};

(async () => {
  const modelsToTest = [
    'gemini-1.5-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-pro'
  ];

  for (const model of modelsToTest) {
    const success = await tryGenerateWithModel(model);
    if (success) {
      console.log(`\n🎉 Model đề xuất sử dụng: '${model}'`);
      process.exit(0);
    }
  }
  
  console.log("\n❌ Không chạy thử được model nào. Vui lòng kiểm tra lại cấu hình tài khoản Google Cloud.");
  process.exit(1);
})();
