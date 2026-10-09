import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      {/* The file has a pale margin around the navy square; scaling inside the clip trims it. */}
      <span className="block size-8 overflow-hidden rounded-md">
        <Image src="/logo.jpeg" alt="" width={64} height={64} priority className="size-full scale-[1.07] object-cover" />
      </span>
      <span className="heading text-xl leading-none">SignFlow</span>
    </Link>
  );
}
