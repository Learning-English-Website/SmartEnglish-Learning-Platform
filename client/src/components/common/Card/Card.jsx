import { useNavigate } from 'react-router-dom';

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  as = 'div',
  to,
  ...rest
}) {
  const navigate = useNavigate();
  const isClickable = !!onClick || !!to;

  const handleClick = () => {
    if (onClick) onClick();
    else if (to) navigate(to);
  };

  const Tag = as;

  return (
    <Tag
      className={`custom-card ${hoverable || isClickable ? 'custom-card-hoverable' : ''} ${isClickable ? 'custom-card-clickable' : ''} ${className}`}
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className = '', ...rest }) {
  return <div className={`custom-card-header ${className}`} {...rest}>{children}</div>;
}

export function CardBody({ children, className = '', ...rest }) {
  return <div className={`custom-card-body ${className}`} {...rest}>{children}</div>;
}

export function CardFooter({ children, className = '', ...rest }) {
  return <div className={`custom-card-footer ${className}`} {...rest}>{children}</div>;
}
