import Image from "next/image"

interface UserAvatarProps {
  name: string
  initials: string
  src?: string
}

export function UserAvatar({ name, initials, src }: UserAvatarProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative size-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
        {src ? (
          <Image src={src} alt={name} fill className="object-cover" />
        ) : (
          <span className="font-karantina text-xl leading-none text-foreground">
            {initials}
          </span>
        )}
      </div>
      <span className="font-karantina text-xl tracking-wide uppercase text-muted-foreground">{name}</span>
    </div>
  )
}
