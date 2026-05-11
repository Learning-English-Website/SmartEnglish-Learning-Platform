const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'];

const SIZES = { sm: 'badge-sm', md: 'badge-md', lg: 'badge-lg' };

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  className = '',
  onClick,
  as: Tag = 'span',
  ...rest
}) {
  const variantClass = VARIANTS.includes(variant) ? `badge-${variant}` : 'badge-primary';

  return (
    <Tag
      className={`badge ${variantClass} ${SIZES[size] || SIZES.md} ${pill ? 'badge-pill' : ''} ${onClick ? 'badge-clickable' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
