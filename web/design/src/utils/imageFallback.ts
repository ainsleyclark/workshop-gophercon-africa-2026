import type { SyntheticEvent } from 'react';

export function handleDesignImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied) return;
  image.dataset.fallbackApplied = 'true';
  image.src = '/assets/showcase/wildlife-placeholder.svg';
}
