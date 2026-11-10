"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ZoomImageProps {
  src: string;
  alt: string;
  title?: string;
  /** Intrinsic size, so the browser reserves space before the image loads. */
  width?: number;
  height?: number;
}

/**
 * A lazy-loaded post image that opens full size in a modal `<dialog>`.
 *
 * The trigger is a real button (Enter/Space), the native dialog traps focus
 * and closes on Esc, a click on the backdrop or the close button closes it,
 * and focus returns to the trigger. The dialog is portalled to <body> and
 * only mounted while open, so it never sits inside the post's <p>.
 */
export function ZoomImage({ src, alt, title, width, height }: ZoomImageProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const label = alt ? `Enlarge image: ${alt}` : "Enlarge image";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mdx-zoom"
        aria-haspopup="dialog"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer */}
        <img
          src={src}
          alt={alt}
          title={title}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </button>
      {open
        ? createPortal(
            <dialog
              ref={dialogRef}
              className="mdx-zoom-dialog"
              aria-label={alt || "Image"}
              onClose={handleClose}
              onClick={(event) => {
                // A click on the backdrop lands on the <dialog> itself.
                if (event.target === event.currentTarget) {
                  dialogRef.current?.close();
                }
              }}
            >
              <form method="dialog" className="mdx-zoom-dialog__bar">
                <span aria-hidden="true">{alt || "image"}</span>
                <button type="submit" autoFocus>
                  [ close ]
                </button>
              </form>
              {/* eslint-disable-next-line @next/next/no-img-element -- static export: no image optimizer */}
              <img src={src} alt={alt} width={width} height={height} />
            </dialog>,
            document.body,
          )
        : null}
    </>
  );
}
