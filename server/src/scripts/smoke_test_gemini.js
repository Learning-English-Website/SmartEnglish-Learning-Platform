const { GoogleGenAI } = require('@google/genai');

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERROR: Thiếu GEMINI_API_KEY.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

(async () => {
  try {
    console.log("=========================================================");
    console.log("🚀 Bắt đầu Smoke Test gọi trực tiếp Gemini API thật...");
    console.log("=========================================================");

    const response = await ai.models.list();
    
    console.log("\n✅ [DANH SÁCH CÁC MODEL BẠN CÓ THỂ DÙNG]:");
    if (response && response.models) {
      response.models.forEach(model => {
        console.log(`- ${model.name}`);
      });
    } else {
      console.log(JSON.stringify(response, null, 2));
    }
  } catch (error) {
    console.error("\n❌ [TRUY VẤN THẤT BẠI]:");
    console.error(error.message);
    process.exit(1);
  }
})();
