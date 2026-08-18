type KeywordModalProps = {
  isOpen: boolean
  draft: string
  onDraftChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export function KeywordsModal({
  isOpen,
  draft,
  onDraftChange,
  onClose,
  onSave,
}: KeywordModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyword-modal-title"
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2
          id="keyword-modal-title"
          className="text-lg font-semibold text-text-h"
        >
          Add keywords
        </h2>
        <p className="mt-1 text-sm text-muted">
          One keyword per line. Empty lines are ignored. Duplicates are removed.
        </p>

        <label
          className="mt-4 block text-sm text-muted"
          htmlFor="keyword-draft"
        >
          Keywords
        </label>
        <textarea
          id="keyword-draft"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          rows={8}
          placeholder="2048 game&#10;2048 balls&#10;best 2048"
          className="mt-2 w-full resize-y rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-h outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-muted hover:text-text-h"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
