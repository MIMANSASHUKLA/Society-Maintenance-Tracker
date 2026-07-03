export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    // 1. Total Maintenance Collected
    const totalCollectedRow = db.prepare("SELECT SUM(amount) as total FROM payments").get() as { total: number | null } | undefined;
    const totalCollected = totalCollectedRow?.total || 0;

    // 2. Monthly Collection Breakdown (Last 12 Months)
    // We group by month. SQLite strftime '%Y-%m' is useful.
    const monthlyQuery = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month_key, SUM(amount) as total
      FROM payments
      GROUP BY month_key
      ORDER BY month_key ASC
    `).all() as { month_key: string; total: number }[];

    // Map month keys to short names
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyChartData = monthlyQuery.map((row) => {
      const [year, monthStr] = row.month_key.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      return {
        label: `${monthNames[monthIdx]} ${year.substring(2)}`,
        value: row.total
      };
    });

    // 3. Pending Dues (Breakdown by Category)
    // Overdue Flats: dues >= 3000
    // Partial Payments: dues > 0 AND dues < 3000 (e.g. 1500)
    // Cleared Dues: dues = 0
    const flatsData = db.prepare("SELECT maintenance_dues FROM flats WHERE occupancy_status = 'Occupied'").all() as { maintenance_dues: number }[];
    
    let overdueCount = 0;
    let overdueSum = 0;
    let partialCount = 0;
    let partialSum = 0;
    let clearedCount = 0;

    flatsData.forEach((flat) => {
      if (flat.maintenance_dues >= 3000) {
        overdueCount++;
        overdueSum += flat.maintenance_dues;
      } else if (flat.maintenance_dues > 0) {
        partialCount++;
        partialSum += flat.maintenance_dues;
      } else {
        clearedCount++;
      }
    });

    const totalPendingDues = overdueSum + partialSum;

    // 4. Occupancy Metrics
    const totalFlatsRow = db.prepare("SELECT COUNT(*) as count FROM flats").get() as { count: number };
    const occupiedFlatsRow = db.prepare("SELECT COUNT(*) as count FROM flats WHERE occupancy_status = 'Occupied'").get() as { count: number };
    const vacantFlatsRow = db.prepare("SELECT COUNT(*) as count FROM flats WHERE occupancy_status = 'Vacant'").get() as { count: number };

    // 5. Complaint ticket stats
    const openTicketsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Open'").get() as { count: number };
    const progressTicketsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'In Progress'").get() as { count: number };
    const resolvedTicketsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'Resolved'").get() as { count: number };

    // Overdue tickets (calculated dynamically)
    const overdueThresholdRow = db.prepare("SELECT value FROM settings WHERE key = 'overdue_threshold_days'").get() as { value: string } | undefined;
    const thresholdDays = overdueThresholdRow ? parseInt(overdueThresholdRow.value, 10) : 3;

    const complaintsList = db.prepare("SELECT created_at, status FROM complaints WHERE status != 'Resolved'").all() as { created_at: string; status: string }[];
    const now = new Date();
    let overdueTicketsCount = 0;

    complaintsList.forEach((c) => {
      const createdAt = new Date(c.created_at);
      const diffTime = now.getTime() - createdAt.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= thresholdDays) {
        overdueTicketsCount++;
      }
    });

    // Calculate monthly growth relative to previous month dynamically
    const currentMonthKey = now.toISOString().substring(0, 7);
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = prevMonth.toISOString().substring(0, 7);

    const currentMonthCollectionRow = db.prepare(`
      SELECT SUM(amount) as total FROM payments
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(currentMonthKey) as { total: number | null } | undefined;
    const currentMonthCollection = currentMonthCollectionRow?.total || 0;

    const prevMonthCollectionRow = db.prepare(`
      SELECT SUM(amount) as total FROM payments
      WHERE strftime('%Y-%m', created_at) = ?
    `).get(prevMonthKey) as { total: number | null } | undefined;
    const prevMonthCollection = prevMonthCollectionRow?.total || 0;

    const growthAmount = currentMonthCollection - prevMonthCollection;

    return NextResponse.json({
      total_collected: totalCollected,
      growth_amount: growthAmount,
      monthly_chart: monthlyChartData,
      pending_dues: {
        total: totalPendingDues,
        categories: {
          overdue: { count: overdueCount, sum: overdueSum },
          partial: { count: partialCount, sum: partialSum },
          cleared: { count: clearedCount }
        }
      },
      occupancy: {
        total: totalFlatsRow.count,
        occupied: occupiedFlatsRow.count,
        vacant: vacantFlatsRow.count
      },
      tickets: {
        open: openTicketsRow.count,
        in_progress: progressTicketsRow.count,
        resolved: resolvedTicketsRow.count,
        overdue: overdueTicketsCount
      }
    });
  } catch (error) {
    console.error('Dashboard Stats GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
