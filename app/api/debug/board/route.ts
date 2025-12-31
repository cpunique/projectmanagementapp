// Debug API endpoint to inspect board data in Firebase
import { NextResponse } from 'next/server';
import { getBoard } from '@/lib/firebase/firestore';
import { getDb } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('id');

    if (!boardId) {
      return NextResponse.json(
        { error: 'Board ID required. Use ?id=boardId' },
        { status: 400 }
      );
    }

    // Get the board directly from Firebase
    const board = await getBoard(boardId);

    if (!board) {
      return NextResponse.json(
        {
          error: 'Board not found',
          boardId,
          message: 'This board does not exist in Firebase'
        },
        { status: 404 }
      );
    }

    // Return the full board data including all cards
    return NextResponse.json({
      success: true,
      boardId,
      board: {
        name: board.name,
        id: board.id,
        columns: board.columns.map(col => ({
          id: col.id,
          title: col.title,
          order: col.order,
          cardCount: col.cards?.length || 0,
          cards: col.cards || []
        })),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt
      }
    });
  } catch (error) {
    console.error('[Debug Board] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name
      },
      { status: 500 }
    );
  }
}
