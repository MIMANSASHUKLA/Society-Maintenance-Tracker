export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const setting = db.prepare("SELECT value FROM settings WHERE key = 'overdue_threshold_days'").get() as { value: string } | undefined;
    const threshold = setting ? parseInt(setting.value, 10) : 3;
    return NextResponse.json({ overdue_threshold_days: threshold });
  } catch (error) {
    console.error('Settings GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { overdue_threshold_days } = await request.json();
    const thresholdVal = parseInt(overdue_threshold_days, 10);

    if (isNaN(thresholdVal) || thresholdVal < 1) {
      return NextResponse.json({ error: 'Threshold must be a positive integer' }, { status: 400 });
    }

    db.prepare("INSERT INTO settings (key, value) VALUES ('overdue_threshold_days', ?) ON CONFLICT(key) DO UPDATE SET value = ?")
      .run(thresholdVal.toString(), thresholdVal.toString());

    return NextResponse.json({ success: true, overdue_threshold_days: thresholdVal });
  } catch (error) {
    console.error('Settings PUT API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
