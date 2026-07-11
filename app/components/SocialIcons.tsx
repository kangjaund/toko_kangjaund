import { Globe, type LucideIcon } from "lucide-react";

// lucide-react versi terbaru sudah menghapus semua ikon brand (trademark),
// jadi semua ikon platform sosial media di bawah ini pakai SVG custom.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.56A3.02 3.02 0 0 0 .5 6.2 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14C4.5 20.5 12 20.5 12 20.5s7.5 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717-1.34 1.669-2.032 4.03-2.058 7.02.026 2.99.718 5.35 2.058 7.02 1.43 1.78 3.63 2.696 6.54 2.717 2.623-.02 4.363-.65 5.826-2.107 1.666-1.657 1.635-3.69 1.106-4.907-.313-.72-.878-1.317-1.653-1.77-.192 1.352-.628 2.43-1.302 3.213-.892 1.036-2.15 1.605-3.744 1.69-1.21.065-2.375-.218-3.28-.796-1.07-.683-1.697-1.72-1.766-2.92-.135-2.36 1.744-4.06 4.68-4.23.968-.057 1.874-.017 2.708.117-.11-.663-.336-1.19-.674-1.573-.463-.523-1.18-.79-2.132-.795h-.026c-.766 0-1.813.213-2.478 1.222l-1.837-1.263c.892-1.35 2.34-2.093 4.318-2.093h.03c3.246.02 5.174 2.006 5.365 5.478l.006.11c.005.01.01.023.014.033.033.077.07.16.104.24 1.35.685 2.35 1.68 2.89 2.887.784 1.75 1.017 4.706-1.446 7.16C17.633 22.99 15.283 23.977 12.19 24Zm.685-12.696c-.115 0-.232.003-.35.01-1.653.093-2.68.9-2.626 1.898.052.9 1.14 1.373 2.184 1.32 1.088-.058 1.86-.573 2.294-1.53.278-.61.35-1.31.354-1.58a6.7 6.7 0 0 0-1.856-.118Z" />
    </svg>
  );
}

function TwitterXIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.9 2H22l-7.6 8.7L23.3 22h-7l-5.5-6.6L4.5 22H1.4l8.1-9.3L1 2h7.2l5 6.1L18.9 2Zm-1.2 18h1.7L6.4 3.9H4.6L17.7 20Z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export const SOCIAL_PLATFORMS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "instagram", label: "Instagram", icon: InstagramIcon as unknown as LucideIcon },
  { value: "tiktok", label: "TikTok", icon: TikTokIcon as unknown as LucideIcon },
  { value: "youtube", label: "YouTube", icon: YoutubeIcon as unknown as LucideIcon },
  { value: "threads", label: "Threads", icon: ThreadsIcon as unknown as LucideIcon },
  { value: "twitter", label: "X (Twitter)", icon: TwitterXIcon as unknown as LucideIcon },
  { value: "facebook", label: "Facebook", icon: FacebookIcon as unknown as LucideIcon },
  { value: "website", label: "Website lain", icon: Globe },
];

export function SocialIcon({
  platform,
  className,
}: {
  platform: string | null;
  className?: string;
}) {
  const found = SOCIAL_PLATFORMS.find((p) => p.value === platform);
  const Icon = found?.icon ?? Globe;
  return <Icon className={className} />;
}
