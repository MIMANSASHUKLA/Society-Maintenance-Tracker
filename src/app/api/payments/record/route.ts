export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flat_no, resident_name, amount, method, ref_no } = await request.json();

    if (!flat_no || !resident_name || !amount || !method || !ref_no) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
    }

    // 1. Insert transaction into payments log
    db.prepare(`
      INSERT INTO payments (flat_no, resident_name, amount, method, ref_no)
      VALUES (?, ?, ?, ?, ?)
    `).run(flat_no, resident_name, amount, method, ref_no);

    // 2. Adjust matching flat dues balance in SQLite
    const selectFlat = db.prepare("SELECT maintenance_dues FROM flats WHERE flat_no = ?");
    const flatRecord = selectFlat.get(flat_no) as { maintenance_dues: number } | undefined;

    if (flatRecord) {
      const newDues = Math.max(0, flatRecord.maintenance_dues - amount);
      db.prepare("UPDATE flats SET maintenance_dues = ? WHERE flat_no = ?").run(newDues, flat_no);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording manual payment:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
