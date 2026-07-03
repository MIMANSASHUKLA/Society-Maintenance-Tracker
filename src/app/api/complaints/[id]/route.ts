export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const complaintId = parseInt(params.id, 10);
    if (isNaN(complaintId)) {
      return NextResponse.json({ error: 'Invalid complaint ID' }, { status: 400 });
    }

    // Fetch complaint
    const complaint = db.prepare(`
      SELECT c.*, u.name as resident_name, u.email as resident_email
      FROM complaints c
      JOIN users u ON c.resident_id = u.id
      WHERE c.id = ?
    `).get(complaintId) as any;

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Authorization check: Resident can only view their own
    if (user.role === 'resident' && complaint.resident_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch status history
    const history = db.prepare(`
      SELECT * FROM complaint_history
      WHERE complaint_id = ?
      ORDER BY created_at ASC
    `).all(complaintId);

    return NextResponse.json({ complaint, history });
  } catch (error) {
    console.error('Complaint Detail GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const complaintId = parseInt(params.id, 10);
    if (isNaN(complaintId)) {
      return NextResponse.json({ error: 'Invalid complaint ID' }, { status: 400 });
    }

    const { status, priority, note } = await request.json();

    // Fetch current complaint status
    const current = db.prepare('SELECT status, priority, category, resident_id FROM complaints WHERE id = ?')
      .get(complaintId) as { status: string; priority: string; category: string; resident_id: number } | undefined;

    if (!current) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Block modifications if already Resolved (Closed)
    if (current.status === 'Resolved') {
      return NextResponse.json({ error: 'Complaint is already resolved and closed.' }, { status: 400 });
    }

    const updatedStatus = status || current.status;
    const updatedPriority = priority || current.priority;
    const updateNote = note ? note.trim() : '';

    if (updatedStatus !== 'Open' && updatedStatus !== 'In Progress' && updatedStatus !== 'Resolved') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    if (updatedPriority !== 'Low' && updatedPriority !== 'Medium' && updatedPriority !== 'High') {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Update complaint in database
    db.prepare(`
      UPDATE complaints
      SET status = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(updatedStatus, updatedPriority, complaintId);

    // If status changed, record to history
    const statusChanged = current.status !== updatedStatus;
    if (statusChanged) {
      db.prepare(`
        INSERT INTO complaint_history (complaint_id, actor_id, actor_name, actor_role, old_status, new_status, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        complaintId,
        user.id,
        user.name,
        user.role,
        current.status,
        updatedStatus,
        updateNote || `Status updated to ${updatedStatus} by admin.`
      );

      // Trigger email notification to the resident
      const resident = db.prepare('SELECT name, email FROM users WHERE id = ?').get(current.resident_id) as { name: string; email: string } | undefined;
      if (resident) {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #2b6cb0;">Complaint Status Update</h2>
            <p>Dear <strong>${resident.name}</strong>,</p>
            <p>The status of your complaint regarding <strong>${current.category}</strong> has been updated by the administrator.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr style="background: #f7fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; width: 120px;">Complaint ID</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">#${complaintId}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Category</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${current.category}</td>
              </tr>
              <tr style="background: #f7fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Previous Status</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; color: #718096;">${current.status}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">New Status</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: ${updatedStatus === 'Resolved' ? '#38a169' : '#dd6b20'};">${updatedStatus}</td>
              </tr>
              <tr style="background: #f7fafc;">
                <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Update Note</td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;"><em>${updateNote || 'No explanation provided.'}</em></td>
              </tr>
            </table>
            <p style="font-size: 13px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
              This is an automated notification. Please do not reply directly to this email.
            </p>
          </div>
        `;
        
        // Asynchronous call (don't await so the API responds instantly)
        sendEmail({
          to: resident.email,
          subject: `[Update] Complaint #${complaintId} status changed to ${updatedStatus}`,
          html: emailBody
        }).catch((err) => console.error('Failed to dispatch status email:', err));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Complaint updated successfully',
      status: updatedStatus,
      priority: updatedPriority
    });

  } catch (error) {
    console.error('Complaint Detail PUT Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
