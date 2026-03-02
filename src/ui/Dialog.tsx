import React, { createContext, useContext, useState } from "react";

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog = ({ children, open, onOpenChange }: DialogProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange ?? setInternalOpen;

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen: setIsOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

const useDialog = () => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error("useDialog must be used within a Dialog");
  }
  return context;
};

interface DialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children }) => {
  const { setOpen } = useDialog();

  const handleClick = (
    originalOnClick: React.MouseEventHandler<HTMLElement> | undefined,
    e: React.MouseEvent<HTMLElement>,
  ) => {
    originalOnClick?.(e);
    setOpen(true);
  };

  if (React.isValidElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>(children)) {
    const child = children as React.ReactElement<{
      onClick?: React.MouseEventHandler<HTMLElement>;
    }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent<HTMLElement>) => handleClick(child.props.onClick, e),
    });
  }

  return <button onClick={() => setOpen(true)}>{children}</button>;
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className = "",
}) => {
  const { open, setOpen } = useDialog();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setOpen(false);
        }
      }}
      role="presentation"
      tabIndex={-1}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-md border border-white/25 bg-black/80 p-4 text-[#f3efe6] shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:p-6 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 text-2xl leading-none text-[#b8b1a3] transition-colors hover:text-[#f3efe6] cursor-pointer sm:right-4 sm:top-4"
          aria-label="Close dialog"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({ children }) => {
  return <div className="mb-4">{children}</div>;
};

interface DialogTitleProps {
  children: React.ReactNode;
}

export const DialogTitle: React.FC<DialogTitleProps> = ({ children }) => {
  return <h2 className="font-display text-xl font-bold text-[#f3efe6]">{children}</h2>;
};

interface DialogDescriptionProps {
  children: React.ReactNode;
}

export const DialogDescription: React.FC<DialogDescriptionProps> = ({ children }) => {
  return <p className="text-[#b8b1a3] text-sm mt-1">{children}</p>;
};

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({ children, className = "" }) => {
  return (
    <div className={`mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end ${className}`}>
      {children}
    </div>
  );
};
