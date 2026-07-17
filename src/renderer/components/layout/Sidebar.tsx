import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Главная', icon: '🏠' },
  { to: '/lots', label: 'Лоты', icon: '📦' },
  { to: '/templates', label: 'Шаблоны', icon: '📋' },
  { to: '/history', label: 'История', icon: '📜' },
  { to: '/settings', label: 'Настройки', icon: '⚙️' }
]

/** Left sidebar navigation. */
export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--glass-border)] p-4">
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent/20 text-accent-light'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] hover:text-[var(--text-primary)]'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
