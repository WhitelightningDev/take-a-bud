import { useState } from 'react'
import type { ConfirmDialogState } from '../types'

export function useConfirmDialog() {
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [confirmingDialog, setConfirmingDialog] = useState(false)

  function openConfirmDialog(dialog: ConfirmDialogState) {
    setConfirmDialog(dialog)
  }

  function closeConfirmDialog() {
    setConfirmDialog(null)
  }

  async function handleConfirmDialog() {
    if (!confirmDialog) return

    setConfirmingDialog(true)

    try {
      await confirmDialog.onConfirm()
      setConfirmDialog(null)
    } finally {
      setConfirmingDialog(false)
    }
  }

  return {
    confirmDialog,
    confirmingDialog,
    openConfirmDialog,
    closeConfirmDialog,
    handleConfirmDialog,
  }
}