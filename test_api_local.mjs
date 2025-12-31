import { readFileSync } from 'fs';

// Load env file
const envContent = readFileSync('.env.local', 'utf-8');
const apiKey = envContent.match(/ANTHROPIC_API_KEY=(.+)/)?.[1];

console.log('Testing Anthropic API directly...');
console.log('API Key prefix:', apiKey?.substring(0, 20));

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say hello',
      },
    ],
  }),
});

console.log('Response status:', response.status);

const data = await response.json();
if (!response.ok) {
  console.error('Error:', data);
} else {
  console.log('Success:', data.content[0].text);
}
