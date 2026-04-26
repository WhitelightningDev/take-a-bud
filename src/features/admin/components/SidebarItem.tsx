import type { ReactNode } from 'react'

type SidebarItemProps = {
  active?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}

export function SidebarItem({ active, icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      className={active ? 'adminNav__item adminNav__item--active' : 'adminNav__item'}
      type="button"
      onClick={onClick}
    >
      <span className="adminNav__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="adminNav__label">{label}</span>
    </button>
  )
}