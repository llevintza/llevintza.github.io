import type { ReactNode } from "react";

import { MotionProvider, PageTransition } from "@/components/motion";

// Next.js remounts a template on every navigation (unlike a layout), which
// is what lets PageTransition play on each route change. See
// components/motion/README.md.
export default function Template({ children }: { children: ReactNode }) {
  return (
    <MotionProvider>
      <PageTransition>{children}</PageTransition>
    </MotionProvider>
  );
}
