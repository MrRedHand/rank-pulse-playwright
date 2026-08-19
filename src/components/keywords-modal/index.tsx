import { Modal } from '../shared/modal'
import { Button } from '../shared/button'
import { Textarea } from '../shared/input'
import styles from './index.module.css'

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
  return (
    <Modal isOpen={isOpen} title="Edit keywords" onClose={onClose}>
      <p className={styles.description}>
        One keyword per line. Empty lines are ignored. Duplicates are removed.
      </p>

      <label className={styles.label} htmlFor="keyword-draft">
        Keywords
      </label>
      <Textarea
        id="keyword-draft"
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={8}
        placeholder={'2048 game\n2048 balls\nbest 2048'}
        className={styles.field}
      />

      <div className={styles.footer}>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSave}>Save</Button>
      </div>
    </Modal>
  )
}
