import { useState, useEffect } from 'react';

export interface CardDimensions {
  cardW: number;
  cardH: number;
  faceDownOffset: number;
  faceUpOffset: number;
  gap: number;
}

const CARD_RATIO = 110 / 78;
const FACEDOWN_RATIO = 18 / 110;
const FACEUP_RATIO = 28 / 110;
const MAX_CARD_W = 110;

// Everything on screen besides the cards themselves:
// game-header + wrapper padding + row gap + bottom padding + autocomplete area
const VPAD = 110;

function compute(): CardDimensions {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw <= 520;

  const gap = isMobile ? 5 : 8;
  const hPad = isMobile ? 8 : 16;

  // Width: 7 cards + 6 gaps must fit in viewport
  const cardWByWidth = (vw - hPad - 6 * gap) / 7;

  // Height: top-row (1×cardH) + tableau allowing for mid-game growth (mix of
  // face-down and face-up offsets). Using a realistic mid-game estimate so
  // initial sizing is comfortable without under-sizing for small screens.
  const heightFactor = 1 + 1 + 3 * FACEDOWN_RATIO + 6 * FACEUP_RATIO; // ≈ 3.57
  const cardHByHeight = (vh - VPAD) / heightFactor;
  const cardWByHeight = cardHByHeight / CARD_RATIO;

  const cardW = Math.floor(Math.min(cardWByWidth, cardWByHeight, MAX_CARD_W));
  const cardH = Math.floor(cardW * CARD_RATIO);

  return {
    cardW,
    cardH,
    faceDownOffset: Math.floor(cardH * FACEDOWN_RATIO),
    faceUpOffset: Math.floor(cardH * FACEUP_RATIO),
    gap,
  };
}

export function useCardDimensions(): CardDimensions {
  const [dims, setDims] = useState<CardDimensions>(compute);

  useEffect(() => {
    const handler = () => setDims(compute());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return dims;
}
