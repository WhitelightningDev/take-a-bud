import type { ConfirmDialogState } from '../types'

type ConfirmDialogProps = {
  dialog: ConfirmDialogState | null
  confirming: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({ dialog, confirming, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!dialog) return null

  return (
    <div className="adminModalBackdrop" role="presentation">
      <div className="adminModal" role="dialog" aria-modal="true" aria-label={dialog.title}>
        <div className="adminModal__head">
          <div>
            <h2 className="adminModal__title">{dialog.title}</h2>
            <p className="adminModal__sub">{dialog.description}</p>
          </div>

          <button className="adminModal__close" type="button" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className="adminModal__actions">
          <button className="adminButton" type="button" onClick={onCancel} disabled={confirming}>
            Cancel
          </button>

          <button
            className={dialog.destructive ? 'adminButton adminButton--danger' : 'adminButton adminButton--primary'}
            type="button"
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? 'Working…' : dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}