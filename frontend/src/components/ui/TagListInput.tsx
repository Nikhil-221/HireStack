import { useState, type KeyboardEvent } from 'react'
import { Button } from './Button'

interface TagListInputProps {
  label: string
  placeholder?: string
  items: string[]
  onChange: (items: string[]) => void
}

export function TagListInput({ label, placeholder, items, onChange }: TagListInputProps) {
  const [draft, setDraft] = useState('')

  const addItem = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setDraft('')
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addItem()
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <Button type="button" variant="secondary" onClick={addItem}>
          Add
        </Button>
      </div>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-1.5 text-sm text-slate-700 ring-1 ring-inset ring-slate-200"
            >
              <span>{item}</span>
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Remove ${item}`}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
