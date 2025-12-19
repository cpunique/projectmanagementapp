import { Anthropic } from '@anthropic-ai/sdk';
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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Please add ANTHROPIC_API_KEY to .env.local' },
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

    // 4. Call Claude API
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant that converts feature requests into clear, simple implementation instructions for developers. Keep the language friendly and straightforward, not overly technical. Focus on what needs to be built and why, breaking it down into logical, actionable steps. Be concise but thorough.

${contextPrompt}

Please provide implementation instructions for this feature.`,
        },
      ],
    });

    // 5. Extract the response
    const generatedPrompt = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    if (!generatedPrompt) {
      return NextResponse.json(
        { error: 'No prompt was generated. Please try again.' },
        { status: 500 }
      );
    }

    // 6. Return formatted response
    return NextResponse.json({ prompt: generatedPrompt });

  } catch (error) {
    console.error('Error generating prompt:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Handle specific Anthropic errors
    if (errorMessage.includes('401') || errorMessage.includes('authentication')) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Please check your .env.local configuration.' },
        { status: 401 }
      );
    }

    if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a moment.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate prompt. Please try again.' },
      { status: 500 }
    );
  }
}
