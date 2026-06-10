'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/users', label: 'Users', roles: ['admin', 'group_admin'] },
  { href: '/admin/entities', label: 'Entities', roles: ['group_admin'] },
  { href: '/admin/vendors', label: 'Vendors', roles: ['procurement_officer', 'admin', 'group_admin'] },
  { href: '/admin/cost-centres', label: 'Cost centres', roles: ['finance', 'admin', 'group_admin'] },
  { href: '/admin/budgets', label: 'Budgets', roles: ['finance', 'admin', 'group_admin'] },
  { href: '/admin/approval-matrix', label: 'Approval matrix', roles: ['admin', 'group_admin'] },
]

interface Props {
  callerRole: string
}

export function AdminNav({ callerRole }: Props) {
  const pathname = usePathname()
  const visible = NAV_ITEMS.filter((item) => item.roles.includes(callerRole))

  if (visible.length <= 1) return null

  return (
    <nav className="flex gap-1 flex-wrap">
      {visible.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              isActive
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
