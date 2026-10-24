type IconProps = { className?: string; 'data-testid'?: string }

const base = 'shrink-0'

export function PlayIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={`${base} ${className}`}>
      <path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.3-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5Z" />
    </svg>
  )
}

export function PauseIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={`${base} ${className}`}>
      <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
      <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
    </svg>
  )
}

export function CloseIcon({ className = 'size-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden className={`${base} ${className}`}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

export function FolderIcon({ className = 'size-4' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden className={`${base} ${className}`}>
      <path d="M1.75 4.25a1 1 0 0 1 1-1h3.1l1.5 1.5h5.9a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

export function FilmIcon({ className = 'size-8' }: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden className={`${base} ${className}`}>
      <rect x="4" y="7" width="24" height="18" rx="3" />
      <path d="M13.5 12.5v7l6-3.5-6-3.5Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function GripIcon({ className = 'size-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={`${base} ${className}`}>
      <circle cx="6" cy="4" r="1.2" />
      <circle cx="10" cy="4" r="1.2" />
      <circle cx="6" cy="8" r="1.2" />
      <circle cx="10" cy="8" r="1.2" />
      <circle cx="6" cy="12" r="1.2" />
      <circle cx="10" cy="12" r="1.2" />
    </svg>
  )
}

export function FadeInIcon({ className = 'size-3', ...rest }: IconProps) {
  return (
    <svg {...rest} viewBox="0 0 12 12" fill="currentColor" aria-hidden className={`${base} ${className}`}>
      <path d="M1 11 11 2v9Z" />
    </svg>
  )
}

export function FadeOutIcon({ className = 'size-3', ...rest }: IconProps) {
  return (
    <svg {...rest} viewBox="0 0 12 12" fill="currentColor" aria-hidden className={`${base} ${className}`}>
      <path d="M1 2l10 9H1Z" />
    </svg>
  )
}

export function ImageIcon({ className = 'size-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden className={`${base} ${className}`}>
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <path d="M2.5 11.5 6 8l2.5 2.5L10.5 8.5l3 3" />
    </svg>
  )
}

export function SpeakerIcon({ className = 'size-3.5' }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`${base} ${className}`}>
      <path d="M2.5 6.25h2.25L8 3.5v9L4.75 9.75H2.5Z" />
      <path d="M10.5 6a3 3 0 0 1 0 4M12.25 4.25a5.5 5.5 0 0 1 0 7.5" />
    </svg>
  )
}
