import { NextResponse } from 'next/server';

interface GeneratePromptRequest {
  cardTitle: string;
  description?: string;
  notes?: string;
  checklist?: Array<{ text: string; completed: boolean }>;
  tags?: string[];
  priority?: "low" | "medium" | "high";
}

export async function POST(request: Request) {
  try {
    // 1. Validate API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // 2. Parse request body
    const body: GeneratePromptRequest = await request.json();

    if (!body.cardTitle || body.cardTitle.trim() === '') {
      return NextResponse.json(
        { error: 'Card title is required' },
        { status: 400 }
      );
    }

    // 3. Build context prompt
    let contextPrompt = `Feature Request: ${body.cardTitle}\n\n`;

    if (body.description) {
      contextPrompt += `Description: ${body.description}\n\n`;
    }

    if (body.notes) {
      // Strip HTML tags from rich text notes
      const plainNotes = body.notes.replace(/<[^>]*>/g, '').trim();
      if (plainNotes) {
        contextPrompt += `Additional Notes: ${plainNotes}\n\n`;
      }
    }

    if (body.checklist && body.checklist.length > 0) {
      contextPrompt += `Requirements Checklist:\n`;
      body.checklist.forEach(item => {
        const status = item.completed ? '✓' : '○';
        contextPrompt += `${status} ${item.text}\n`;
      });
      contextPrompt += `\n`;
    }

    if (body.tags && body.tags.length > 0) {
      contextPrompt += `Related Tags: ${body.tags.join(', ')}\n\n`;
    }

    if (body.priority) {
      contextPrompt += `Priority Level: ${body.priority}\n\n`;
    }

    // 4. Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that converts feature requests into clear, simple implementation instructions for developers. Keep the language friendly and straightforward, not overly technical. Focus on what needs to be built and why, breaking it down into logical, actionable steps. Be concise but thorough.`
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your .env.local configuration.' },
          { status: 401 }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to generate prompt from OpenAI' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedPrompt = data.choices[0]?.message?.content || '';

    if (!generatedPrompt) {
      return NextResponse.json(
        { error: 'No prompt was generated. Please try again.' },
        { status: 500 }
      );
    }

    // 5. Return formatted response
    return NextResponse.json({ prompt: generatedPrompt });

  } catch (error) {
    console.error('Error generating prompt:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
}
