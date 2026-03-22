import type { SVGProps } from "react";

function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </IconBase>
  );
}

export function BookmarkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    </IconBase>
  );
}

export function LibraryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
      <path d="M3 20h18" />
    </IconBase>
  );
}

export function UserIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3 4.2-4.5 7-4.5s5.5 1.5 7 4.5" />
    </IconBase>
  );
}

export function CreateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 11.5h12v6.5H6z" />
      <path d="M8.5 9.5c0-1 1.1-1.8 3.5-1.8s3.5.8 3.5 1.8" />
      <path d="M8 15h8" />
      <path d="M19.5 12.8h2.8" />
      <path d="M20.9 11.4v2.8" />
      <path d="M10.2 5.8c0-.8.6-1.4 1.4-1.4" />
      <path d="M13.8 5.8c0-.8-.6-1.4-1.4-1.4" />
    </IconBase>
  );
}
