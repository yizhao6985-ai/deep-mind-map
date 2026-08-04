import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  )
}

export function IconLibrary(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <path d="M8 7h8M8 11h6" />
    </Icon>
  )
}

export function IconPlus(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function IconMinus(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function IconFitView(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" />
    </Icon>
  )
}

export function IconImport(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </Icon>
  )
}

export function IconExport(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </Icon>
  )
}

export function IconSettings(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Icon>
  )
}

export function IconUndo(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
    </Icon>
  )
}

export function IconRedo(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13" />
    </Icon>
  )
}

/** Add child — branch out to the right */
export function IconChild(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="9" width="6" height="6" rx="1.4" />
      <path d="M9 12h3.5" />
      <path d="M12.5 12c0-4 2-6.5 4.5-6.5h1" />
      <rect x="15.5" y="2.5" width="5.5" height="5.5" rx="1.2" />
      <path d="M16.5 16h5M19 13.5v5" />
    </Icon>
  )
}

/** Add sibling — peer under the same parent */
export function IconSibling(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="9" y="2.5" width="6" height="5.5" rx="1.2" />
      <path d="M12 8v3.5" />
      <path d="M6 14h12" />
      <rect x="3" y="14" width="6" height="5.5" rx="1.2" />
      <path d="M15.5 15.5h5M18 13v5" />
    </Icon>
  )
}

/** Collapse subtree (right-map: fold children) */
export function IconCollapse(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m14.5 7-5 5 5 5" />
    </Icon>
  )
}

/** Expand collapsed subtree */
export function IconExpand(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m9.5 7 5 5-5 5" />
    </Icon>
  )
}

/** Collapse left sidebar panel */
export function IconPanelLeftClose(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </Icon>
  )
}

/** Expand left sidebar panel */
export function IconPanelLeftOpen(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </Icon>
  )
}

export function IconTrash(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M18 7v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7" />
      <path d="M10 11v6M14 11v6" />
    </Icon>
  )
}

export function IconSparkles(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
    </Icon>
  )
}

export function IconSend(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Icon>
  )
}

export function IconStop(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconGithub(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9 19c-4 1.5-4-2-6-2" />
      <path d="M15 22v-3.9a3.4 3.4 0 0 0-1-2.6c3.2-.4 6.5-1.6 6.5-7A5.4 5.4 0 0 0 19 4.7 5 5 0 0 0 18.9 1S17.7.7 15 2.6a12 12 0 0 0-6 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.7 5.4 5.4 0 0 0 3.5 8.5c0 5.4 3.3 6.6 6.5 7a3.4 3.4 0 0 0-1 2.6V22" />
    </Icon>
  )
}

export function IconUpload(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 16V6" />
      <path d="m7 10 5-5 5 5" />
      <path d="M5 20h14" />
    </Icon>
  )
}

export function IconPaperclip(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </Icon>
  )
}

export function IconDownload(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 4v10" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  )
}

export function IconFileJson(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M10 13c-.5 0-1 .4-1 1s.5 1 1 1 1 .4 1 1-.5 1-1 1" />
      <path d="M14 13c.5 0 1 .4 1 1s-.5 1-1 1-1 .4-1 1 .5 1 1 1" />
    </Icon>
  )
}

export function IconFile(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </Icon>
  )
}

export function IconMarkdown(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15V9l2.5 3L12 9v6" />
      <path d="M15 12h2M17 12v3" />
    </Icon>
  )
}

export function IconImage(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 15-4.5-4.5L7 20" />
    </Icon>
  )
}

export function IconMore(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function IconChevronDown(p: IconProps) {
  return (
    <Icon {...p} size={p.size ?? 14}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function IconChevronRight(p: IconProps) {
  return (
    <Icon {...p} size={p.size ?? 14}>
      <path d="m9 6 6 6-6 6" />
    </Icon>
  )
}

export function IconFolder(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </Icon>
  )
}

export function IconFolderPlus(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 19H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1.5" />
      <path d="M16 16h6M19 13v6" />
    </Icon>
  )
}

export function IconStyleClassic(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="8" r="3" />
      <path d="M12 11v3" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M12 14l-3 2M12 14l3 2" />
    </Icon>
  )
}

export function IconStyleCompact(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="8" y="4" width="8" height="4" rx="1" />
      <rect x="4" y="11" width="7" height="3" rx="1" />
      <rect x="13" y="11" width="7" height="3" rx="1" />
      <rect x="4" y="17" width="7" height="3" rx="1" />
      <rect x="13" y="17" width="7" height="3" rx="1" />
    </Icon>
  )
}

export function IconStyleCard(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="5" y="4" width="14" height="6" rx="2" />
      <rect x="5" y="13" width="14" height="6" rx="2" />
    </Icon>
  )
}

export function IconMap(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 5v2.5M12 16.5V19M5 12h2.5M16.5 12H19" />
      <path d="m7.5 7.5 1.8 1.8M14.7 14.7l1.8 1.8M16.5 7.5l-1.8 1.8M9.3 14.7l-1.8 1.8" />
    </Icon>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}
