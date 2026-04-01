import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  throw new Error('GROQ_API_KEY not set in environment variables');
}

async function testGroqAPI() {
  try {
    console.log('🧪 Testing Groq API...\n');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: 'Say hello in one sentence'
          }
        ],
        max_tokens: 256
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API Error');
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content;

    console.log('✅ Groq API is working!');
    console.log('\nResponse:');
    console.log(message);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGroqAPI();
