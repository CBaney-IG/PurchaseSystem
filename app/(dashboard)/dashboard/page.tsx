import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back{user?.email ? `, ${user.email}` : ''}.
          </p>
        </div>

        {/* Metric cards — placeholders until F-012/F-013 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'My Pending Requests', value: '—' },
            { label: 'Pending My Approval', value: '—' },
            { label: 'Budget Utilisation', value: '—' },
            { label: 'YTD Spend vs Budget', value: '—' },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-lg border border-slate-200 p-5"
            >
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-400">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Build status notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900">F-001 Scaffolding complete</p>
          <p className="text-sm text-blue-700 mt-1">
            Authentication is working. Database schema and UI features are built in subsequent
            backlog items (F-003 onward).
          </p>
        </div>

      </div>
    </div>
  )
}
