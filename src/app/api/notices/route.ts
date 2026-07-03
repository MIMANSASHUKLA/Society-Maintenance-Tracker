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

    // Fetch all notices: important/pinned first, then chronological (newest first)
    const notices = db.prepare(`
      SELECT n.*, u.name as author_name
      FROM notices n
      JOIN users u ON n.author_id = u.id
      ORDER BY n.is_important DESC, n.created_at DESC
    `).all() as any[];

    return NextResponse.json({ notices });
  } catch (error) {
    console.error('Notices GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { title, content, is_important } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const isImportantVal = is_important ? 1 : 0;

    const runResult = db.prepare(`
      INSERT INTO notices (title, content, is_important, author_id)
      VALUES (?, ?, ?, ?)
    `).run(title.trim(), content.trim(), isImportantVal, user.id);

    const noticeId = runResult.lastInsertRowid;

    // Send email alert to all residents if marked as important
    if (isImportantVal === 1) {
      const residents = db.prepare("SELECT name, email FROM users WHERE role = 'resident'").all() as { name: string; email: string }[];
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #e53e3e; color: white; padding: 12px; border-radius: 6px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px;">
            ⚠️ URGENT / IMPORTANT ANNOUNCEMENT
          </div>
          <h2 style="color: #2d3748; margin-top: 0;">${title}</h2>
          <div style="background: #f7fafc; padding: 15px; border-left: 4px solid #e53e3e; border-radius: 4px; margin-bottom: 20px; white-space: pre-wrap; line-height: 1.6;">${content}</div>
          <p style="font-size: 13px; color: #718096; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            Posted by Administrator on ${new Date().toLocaleDateString()}
          </p>
        </div>
      `;

      // Dispatch simulated or real email notifications
      for (const res of residents) {
        sendEmail({
          to: res.email,
          subject: `[Important Notice] ${title}`,
          html: emailBody
        }).catch((err) => console.error(`Failed to dispatch notice email to ${res.email}:`, err));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Notice posted successfully',
      noticeId
    }, { status: 201 });

  } catch (error) {
    console.error('Notices POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
