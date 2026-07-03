export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('session_token');
      return response;
    }

    // Attempt to map resident name to their flat data
    let flat = null;
    if (user.role === 'resident') {
      const firstName = user.name.split(' ')[0] || '';
      flat = db.prepare("SELECT * FROM flats WHERE owner_name LIKE ?").get(`%${firstName}%`) as any;
    }

    return NextResponse.json({
      user: {
        ...user,
        flat
      }
    });
  } catch (error) {
    console.error('Auth check API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
