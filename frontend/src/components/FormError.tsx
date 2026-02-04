import { memo } from 'react';

interface Props {
  message?: string;
}

function FormError({ message }: Props) {
  if (!message) return null;

  return (
    <p className="text-red-600 text-sm mt-1">{message}</p>
  );
}

export default memo(FormError);
