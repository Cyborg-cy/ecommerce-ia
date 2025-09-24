"use client";

import React from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function SafeImage({ src, alt, className, style }: Props) {
  const [hidden, setHidden] = React.useState(false);
  if (!src || hidden) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setHidden(true)}
    />
  );
}


