import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { TextArea } from '@/components/ui/TextArea'
import { TagListInput } from '@/components/ui/TagListInput'
import type { JobFormValues } from '@/types/job'

const employmentTypeOptions = [
  { value: 'Full-time', label: 'Full-time' },
  { value: 'Part-time', label: 'Part-time' },
  { value: 'Contract', label: 'Contract' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Temporary', label: 'Temporary' },
]

interface JobFormProps {
  values: JobFormValues
  onChange: (values: JobFormValues) => void
  onSubmit: () => void
  submitLabel: string
  isSubmitting?: boolean
  onGenerateAI?: () => Promise<void>
  secondaryAction?: { label: string; onClick: () => void }
}

export function JobForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  isSubmitting,
  onGenerateAI,
  secondaryAction,
}: JobFormProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const update = <K extends keyof JobFormValues>(key: K, value: JobFormValues[K]) => {
    onChange({ ...values, [key]: value })
  }

  const handleGenerate = async () => {
    if (!onGenerateAI) return
    setIsGenerating(true)
    try {
      await onGenerateAI()
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-8"
    >
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          id="title"
          label="Job title"
          required
          value={values.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="e.g. Backend Engineer"
        />
        <Input
          id="department"
          label="Department"
          required
          value={values.department}
          onChange={(e) => update('department', e.target.value)}
          placeholder="e.g. Engineering"
        />
        <Input
          id="location"
          label="Location"
          required
          value={values.location}
          onChange={(e) => update('location', e.target.value)}
          placeholder="e.g. Remote"
        />
        <Select
          id="employment_type"
          label="Employment type"
          options={employmentTypeOptions}
          value={values.employment_type}
          onChange={(e) => update('employment_type', e.target.value)}
        />
        <Input
          id="experience_required"
          label="Experience required"
          required
          value={values.experience_required}
          onChange={(e) => update('experience_required', e.target.value)}
          placeholder="e.g. 3-5 years"
        />
        <Input
          id="openings"
          label="Openings"
          type="number"
          min={1}
          value={values.openings}
          onChange={(e) => update('openings', e.target.value)}
        />
        <Input
          id="salary_min"
          label="Minimum salary"
          type="number"
          value={values.salary_min}
          onChange={(e) => update('salary_min', e.target.value)}
          placeholder="Optional"
        />
        <Input
          id="salary_max"
          label="Maximum salary"
          type="number"
          value={values.salary_max}
          onChange={(e) => update('salary_max', e.target.value)}
          placeholder="Optional"
        />
      </section>

      {onGenerateAI && (
        <div className="flex items-center justify-between rounded-md border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Job description</p>
            <p className="text-xs text-slate-500">
              Generate a draft description, responsibilities and skills from the title/department above.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerate}
            disabled={isGenerating || !values.title.trim()}
          >
            {isGenerating ? 'Generating…' : 'Generate with AI'}
          </Button>
        </div>
      )}

      <TextArea
        id="description"
        label="Description"
        rows={5}
        value={values.description}
        onChange={(e) => update('description', e.target.value)}
        placeholder="Overview of the role…"
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <TagListInput
          label="Responsibilities"
          placeholder="Add a responsibility and press Enter"
          items={values.responsibilities}
          onChange={(items) => update('responsibilities', items)}
        />
        <TagListInput
          label="Required skills"
          placeholder="Add a required skill and press Enter"
          items={values.required_skills}
          onChange={(items) => update('required_skills', items)}
        />
        <TagListInput
          label="Preferred skills"
          placeholder="Add a preferred skill and press Enter"
          items={values.preferred_skills}
          onChange={(items) => update('preferred_skills', items)}
        />
        <TagListInput
          label="Qualifications"
          placeholder="Add a qualification and press Enter"
          items={values.qualifications}
          onChange={(items) => update('qualifications', items)}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-6">
        {secondaryAction && (
          <Button type="button" variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
