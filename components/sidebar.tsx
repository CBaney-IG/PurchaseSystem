'use client'

import { useState } from 'react'
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
  Menu,
  X,
  User,
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
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/admin', label: 'Admin', icon: Settings },
]

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

interface SidebarProps {
  userEmail: string
}

function NavLinks({
  pathname,
  onNavClick,
}: {
  pathname: string
  onNavClick?: () => void
}) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={cn(
              'flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors min-h-[44px]',
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
    </>
  )
}

function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded bg-slate-900 flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">PS</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900 leading-tight">Purchase System</p>
        <p className="text-xs text-slate-400 leading-tight">BPO Group</p>
      </div>
    </div>
  )
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function closeMobile() {
    setMobileOpen(false)
  }

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200">
        <BrandMark />
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-md text-slate-600 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ── Mobile slide-over overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile slide-over panel ── */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 z-50 h-full w-72 bg-white flex flex-col transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <BrandMark />
          <button
            onClick={closeMobile}
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLinks pathname={pathname} onNavClick={closeMobile} />
        </nav>
        <div className="px-4 py-4 border-t border-slate-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <span className="text-slate-600 text-xs font-medium uppercase">
                {userEmail.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-900 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-slate-700 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-slate-200 bg-white flex-col h-screen sticky top-0">
        <div className="px-6 py-5 border-b border-slate-200">
          <BrandMark />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <NavLinks pathname={pathname} />
        </nav>
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
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
