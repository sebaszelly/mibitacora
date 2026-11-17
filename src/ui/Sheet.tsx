import { type ReactNode, createContext, useContext, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { Drawer } from 'vaul';

const CloseCtx = createContext<() => void>(() => {});
/** Cierra la hoja que contiene al componente, con su animación. */
export const useClose = (): (() => void) => useContext(CloseCtx);

interface Props {
  title: string;
  subtitle?: string;
  /** Se llama cuando la hoja terminó de cerrarse. */
  onClosed: () => void;
  full?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/** Hoja inferior que se cierra arrastrando hacia abajo. */
export function Sheet({ title, subtitle, onClosed, full, footer, children }: Props) {
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  return (
    <Drawer.Root open={open} onOpenChange={setOpen} onAnimationEnd={(isOpen) => !isOpen && onClosed()}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay" />
        <Drawer.Content className={full ? 'sheet full' : 'sheet'} aria-describedby={undefined}>
          <CloseCtx.Provider value={close}>
            <div className="sheet-grip" aria-hidden="true" />
            <div className="sheet-hd">
              <div>
                <Drawer.Title asChild>
                  <h2>{title}</h2>
                </Drawer.Title>
                {subtitle && <p>{subtitle}</p>}
              </div>
              <button type="button" className="icon-btn press" onClick={close} aria-label="Cerrar">
                <X size={22} weight="bold" />
              </button>
            </div>
            <div className="sheet-body">{children}</div>
            {footer && <div className="foot">{footer}</div>}
          </CloseCtx.Provider>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
