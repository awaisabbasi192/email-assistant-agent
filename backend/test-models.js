import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyC5zif1NrnL17PuRyJjiza9vMcPxYDlV-s');

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('✅ Available models:');
    models.forEach(model => {
      console.log(`  - ${model.name}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
