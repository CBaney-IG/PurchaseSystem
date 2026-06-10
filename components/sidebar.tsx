'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  FilePlus,
  Receipt,
  CheckSquare,
  ShoppingBag,
  PieChart,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests/new', label: 'New Request', icon: FilePlus },
  { href: '/expenses/new', label: 'New Expense', icon: Receipt },
  { href: '/requests', label: 'My Requests', icon: FileText },
  { href: '/approvals', label: 'Approvals', icon: CheckSquare },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingBag },
  { href: '/budgets', label: 'Budgets', icon: PieChart },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin', label: 'Admin', icon: Settings },
]

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

interface SidebarProps {
  userEmail: string
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">PS</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 leading-tight">Purchase System</p>
            <p className="text-xs text-slate-400 leading-tight">BPO Group</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-slate-600 text-xs font-medium uppercase">
              {userEmail.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate">{userEmail}</p>
            <p className="text-xs text-slate-400">Development</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
