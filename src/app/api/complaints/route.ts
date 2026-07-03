export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

// Helper to calculate whether a complaint is overdue
function getOverdueDaysLimit() {
  const setting = db.prepare("SELECT value FROM settings WHERE key = 'overdue_threshold_days'").get() as { value: string } | undefined;
  return setting ? parseInt(setting.value, 10) : 3;
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category');
    const statusFilter = searchParams.get('status');
    const dateFilter = searchParams.get('date'); // YYYY-MM-DD format

    const overdueThreshold = getOverdueDaysLimit();
    const now = new Date();

    // Query builder
    let query = `
      SELECT c.*, u.name as resident_name, u.email as resident_email
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
    `;
    const params: any[] = [];
    const conditions: string[] = [];

    if (user.role === 'resident') {
      conditions.push('c.resident_id = ?');
      params.push(user.id);
    }

    if (categoryFilter) {
      conditions.push('c.category = ?');
      params.push(categoryFilter);
    }

    if (statusFilter) {
      conditions.push('c.status = ?');
      params.push(statusFilter);
    }

    if (dateFilter) {
      conditions.push("strftime('%Y-%m-%d', c.created_at) = ?");
      params.push(dateFilter);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const rawComplaints = db.prepare(query).all(...params) as any[];

    // Map and inject is_overdue and age calculations
    const complaints = rawComplaints.map((c) => {
      const createdAt = new Date(c.created_at);
      const diffTime = now.getTime() - createdAt.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const isOverdue = c.status !== 'Resolved' && diffDays >= overdueThreshold;
      return {
        ...c,
        age_days: diffDays,
        is_overdue: isOverdue ? 1 : 0
      };
    });

    // Custom sorting:
    // If admin: Overdue first, then High priority, then Medium, then Low, then newer first.
    // If resident: newer first.
    if (user.role === 'admin') {
      const priorityWeights: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
      complaints.sort((a, b) => {
        // 1. Overdue first
        if (a.is_overdue !== b.is_overdue) {
          return b.is_overdue - a.is_overdue;
        }
        // 2. Priority
        const weightA = priorityWeights[a.priority] || 2;
        const weightB = priorityWeights[b.priority] || 2;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
        // 3. Newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      complaints.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error('Complaints GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'resident') {
      return NextResponse.json({ error: 'Unauthorized. Only residents can file complaints.' }, { status: 403 });
    }

    const formData = await request.formData();
    const category = formData.get('category') as string;
    const description = formData.get('description') as string;
    const photo = formData.get('photo') as File | null;

    if (!category || !description) {
      return NextResponse.json({ error: 'Category and description are required' }, { status: 400 });
    }

    let photoPath = null;

    if (photo && photo.size > 0) {
      const ext = path.extname(photo.name) || '.jpg';
      const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
      
      const buffer = Buffer.from(await photo.arrayBuffer());
      const savePath = path.join(process.cwd(), 'public', 'uploads', filename);
      await fs.promises.writeFile(savePath, buffer);
      photoPath = `/uploads/${filename}`;
    }

    // Insert complaint
    const insertComplaint = db.prepare(`
      INSERT INTO complaints (resident_id, category, description, photo_path, status, priority)
      VALUES (?, ?, ?, ?, 'Open', 'Medium')
    `);
    
    const runResult = insertComplaint.run(user.id, category.trim(), description.trim(), photoPath);
    const complaintId = runResult.lastInsertRowid;

    // Log to history
    db.prepare(`
      INSERT INTO complaint_history (complaint_id, actor_id, actor_name, actor_role, old_status, new_status, note)
      VALUES (?, ?, ?, ?, NULL, 'Open', 'Complaint opened by resident.')
    `).run(complaintId, user.id, user.name, user.role);

    return NextResponse.json({
      success: true,
      message: 'Complaint submitted successfully',
      complaintId
    }, { status: 201 });

  } catch (error) {
    console.error('Complaints POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
