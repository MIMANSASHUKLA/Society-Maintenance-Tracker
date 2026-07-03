export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch payments list, ordered by most recent first (Limit to 50 for performance)
    const payments = db.prepare(`
      SELECT * FROM payments
      ORDER BY created_at DESC
      LIMIT 50
    `).all() as any[];

    // Fetch flats list with dues for the reminder section
    const flatsWithDues = db.prepare(`
      SELECT flat_no, owner_name, maintenance_dues
      FROM flats
      WHERE occupancy_status = 'Occupied' AND maintenance_dues > 0
      ORDER BY maintenance_dues DESC
      LIMIT 10
    `).all() as any[];

    // Fetch all flats
    const allFlats = db.prepare(`
      SELECT flat_no, owner_name, occupancy_status, maintenance_dues
      FROM flats
      ORDER BY flat_no ASC
    `).all() as any[];

    return NextResponse.json({ payments, flatsWithDues, allFlats });
  } catch (error) {
    console.error('Payments GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST endpoint for sending payment reminders
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { flat_no, resident_name, dues_amount } = await request.json();

    if (!flat_no || !resident_name || dues_amount === undefined) {
      return NextResponse.json({ error: 'Flat number, resident name, and dues amount are required' }, { status: 400 });
    }

    // Trigger mock/real email reminder
    const subject = `⚠️ [Urgent Reminder] Outstanding Maintenance Dues for Flat ${flat_no}`;
    
    // We try to fetch the actual user's email if they exist in the user database.
    // If not, we fall back to a mock email.
    let email = 'resident@society.com';
    const dbUser = db.prepare("SELECT email FROM users WHERE name LIKE ?").get(`%${resident_name.split(' ')[0]}%`) as { email: string } | undefined;
    if (dbUser) {
      email = dbUser.email;
    }

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
        <div style="background-color: #d69e2e; color: white; padding: 12px; border-radius: 6px; text-align: center; font-weight: bold; font-size: 16px; margin-bottom: 20px;">
          ⚠️ PAYMENT OUTSTANDING REMINDER
        </div>
        <p>Dear <strong>${resident_name}</strong>,</p>
        <p>This is a friendly reminder that you have pending maintenance dues for <strong>Flat ${flat_no}</strong>.</p>
        <div style="background-color: #fffaf0; border: 1px solid #feebc8; border-radius: 6px; padding: 16px; margin: 20px 0; text-align: center;">
          <span style="font-size: 14px; color: #744210; text-transform: uppercase; font-weight: bold;">Outstanding Balance</span>
          <h2 style="font-size: 32px; color: #b7791f; margin: 8px 0;">₹${dues_amount.toLocaleString('en-IN')}.00</h2>
          <p style="font-size: 13px; color: #744210; margin: 0;">Please clear your maintenance dues at the earliest convenience to avoid late fees.</p>
        </div>
        <p>Payments can be made via UPI scanning or direct bank transfer from your resident portal account dashboard.</p>
        <p style="font-size: 13px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          Issued by: Society Maintenance Management Office
        </p>
      </div>
    `;

    // Send email (async trigger)
    sendEmail({
      to: email,
      subject,
      html: emailBody
    }).catch(err => console.error(`Error sending reminder email to ${email}:`, err));

    return NextResponse.json({ success: true, message: `Payment reminder successfully triggered for Flat ${flat_no}` });
  } catch (error) {
    console.error('Payments POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
