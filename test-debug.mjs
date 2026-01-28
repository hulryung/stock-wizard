import { readFileSync } from 'fs';

// Manual .env.local parsing
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

async function testFinnhub() {
  const key = process.env.FINNHUB_API_KEY;
  console.log('Testing Finnhub...');
  const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`);
  const data = await res.json();
  console.log('Finnhub result:', Array.isArray(data) ? `${data.length} articles` : data);
  if (Array.isArray(data) && data.length > 0) {
    console.log('Sample headline:', data[0].headline);
  }
  return data;
}

async function testGoogleNews() {
  console.log('Testing Google News...');
  const query = encodeURIComponent('경제 산업 기업 뉴스');
  const res = await fetch(`https://news.google.com/rss/search?q=${query}&hl=ko&gl=KR&ceid=KR:ko`);
  const text = await res.text();
  const itemCount = (text.match(/<item>/g) || []).length;
  console.log('Google News result:', itemCount, 'articles');
  return itemCount;
}

async function testOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  console.log('Testing OpenAI...');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "test ok" in JSON format: {"status": "..."}' }],
      response_format: { type: 'json_object' }
    })
  });
  const data = await res.json();
  console.log('OpenAI status:', res.status);
  if (data.choices?.[0]?.message?.content) {
    console.log('OpenAI response:', data.choices[0].message.content);
  } else {
    console.log('OpenAI error:', data);
  }
}

async function main() {
  console.log('=== API Connection Test ===\n');
  await testFinnhub();
  console.log('');
  await testGoogleNews();
  console.log('');
  await testOpenAI();
  console.log('\n=== Done ===');
}

main().catch(console.error);
