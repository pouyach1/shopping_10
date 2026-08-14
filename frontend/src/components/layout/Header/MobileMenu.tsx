interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileMenu({ open, onClose, children }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="منوی موبایل"
      onClick={onClose}
    >
      {children}
    </div>
  );
}
