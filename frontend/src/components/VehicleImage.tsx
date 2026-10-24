import { useState } from 'react';
import { PLACEHOLDER_IMAGE } from '../lib/format';

interface VehicleImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

/** Public image URL first; a bundled local SVG if there is none or it fails (e.g. offline). */
export default function VehicleImage({ src, alt, className }: VehicleImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const effective = src && failedSrc !== src ? src : PLACEHOLDER_IMAGE;
  return <img src={effective} alt={alt} loading="lazy" onError={() => setFailedSrc(src)} className={className} />;
}
