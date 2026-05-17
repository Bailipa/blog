'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="text"
      className="search-input"
      placeholder={placeholder || '搜索...'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
