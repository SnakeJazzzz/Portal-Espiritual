// Constellation letter data for "Portal Espiritual"
// Each letter is defined as a constellation of star points with connections

export interface ConstellationLetter {
  points: { x: number; y: number }[];
  connections: [number, number][];
  width: number; // Relative width factor for spacing
}

// Letter definitions - coordinates are 0-100 relative units per letter cell
// Y: 0 = top, 100 = baseline
// Uppercase letters: ~0-100, Lowercase: ~40-100 (60% height)
export const LETTER_CONSTELLATIONS: Record<string, ConstellationLetter> = {
  // Uppercase P - Prominent, 8 points
  P: {
    width: 1.0,
    points: [
      { x: 15, y: 5 },   // 0: top left
      { x: 18, y: 35 },  // 1: mid-upper left
      { x: 20, y: 65 },  // 2: mid-lower left
      { x: 22, y: 95 },  // 3: bottom left
      { x: 55, y: 8 },   // 4: top right of bowl
      { x: 70, y: 25 },  // 5: right side of bowl
      { x: 62, y: 48 },  // 6: bottom right of bowl
      { x: 25, y: 50 },  // 7: left side where bowl closes
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], // Left vertical stem
      [0, 4], [4, 5], [5, 6], [6, 7], [7, 1], // Bowl connections
    ],
  },

  // Lowercase o - 5 points forming rough circle
  o: {
    width: 0.8,
    points: [
      { x: 50, y: 42 },  // 0: top
      { x: 75, y: 55 },  // 1: right-upper
      { x: 68, y: 85 },  // 2: right-lower
      { x: 35, y: 88 },  // 3: bottom
      { x: 25, y: 60 },  // 4: left
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
    ],
  },

  // Lowercase r - 5 points
  r: {
    width: 0.7,
    points: [
      { x: 25, y: 95 },  // 0: bottom
      { x: 28, y: 70 },  // 1: mid
      { x: 30, y: 45 },  // 2: top of stem
      { x: 55, y: 40 },  // 3: top right curve
      { x: 70, y: 52 },  // 4: end of curve
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4],
    ],
  },

  // Lowercase t - 5 points with crossbar
  t: {
    width: 0.7,
    points: [
      { x: 45, y: 15 },  // 0: top of tall stem
      { x: 42, y: 55 },  // 1: middle
      { x: 40, y: 90 },  // 2: bottom
      { x: 15, y: 48 },  // 3: left of crossbar
      { x: 70, y: 52 },  // 4: right of crossbar
    ],
    connections: [
      [0, 1], [1, 2], // Vertical stem
      [3, 1], [1, 4], // Crossbar
    ],
  },

  // Lowercase a - 6 points, triangle with tail
  a: {
    width: 0.8,
    points: [
      { x: 45, y: 42 },  // 0: top
      { x: 20, y: 88 },  // 1: bottom left
      { x: 55, y: 90 },  // 2: bottom middle
      { x: 78, y: 85 },  // 3: bottom right
      { x: 75, y: 60 },  // 4: right side mid
      { x: 68, y: 45 },  // 5: top right
    ],
    connections: [
      [0, 1], [1, 2], [2, 0], // Triangle
      [2, 3], [3, 4], [4, 5], [5, 0], // Tail
    ],
  },

  // Lowercase l - 4 points, tall vertical
  l: {
    width: 0.5,
    points: [
      { x: 40, y: 8 },   // 0: top
      { x: 38, y: 40 },  // 1: upper-mid
      { x: 35, y: 72 },  // 2: lower-mid
      { x: 32, y: 95 },  // 3: bottom
    ],
    connections: [
      [0, 1], [1, 2], [2, 3],
    ],
  },

  // Uppercase E - 7 points
  E: {
    width: 0.9,
    points: [
      { x: 20, y: 8 },   // 0: top left
      { x: 22, y: 48 },  // 1: middle left
      { x: 25, y: 92 },  // 2: bottom left
      { x: 72, y: 5 },   // 3: top right
      { x: 68, y: 45 },  // 4: middle right
      { x: 75, y: 95 },  // 5: bottom right
      { x: 70, y: 50 },  // 6: extra point for middle bar
    ],
    connections: [
      [0, 1], [1, 2], // Left vertical
      [0, 3], // Top bar
      [1, 4], [1, 6], [6, 4], // Middle bar (angled)
      [2, 5], // Bottom bar
    ],
  },

  // Lowercase s - 6 points, S curve
  s: {
    width: 0.7,
    points: [
      { x: 65, y: 40 },  // 0: top right
      { x: 35, y: 45 },  // 1: top left
      { x: 50, y: 62 },  // 2: middle
      { x: 68, y: 75 },  // 3: lower right
      { x: 32, y: 88 },  // 4: bottom left
      { x: 45, y: 92 },  // 5: bottom
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    ],
  },

  // Lowercase p - 6 points with descender
  p: {
    width: 0.8,
    points: [
      { x: 25, y: 42 },  // 0: top of stem
      { x: 23, y: 70 },  // 1: baseline
      { x: 20, y: 115 }, // 2: descender (below baseline)
      { x: 55, y: 45 },  // 3: top right of bowl
      { x: 72, y: 65 },  // 4: right of bowl
      { x: 58, y: 88 },  // 5: bottom of bowl
    ],
    connections: [
      [0, 1], [1, 2], // Stem with descender
      [0, 3], [3, 4], [4, 5], [5, 1], // Bowl
    ],
  },

  // Lowercase i - 4 points (dot + stem)
  i: {
    width: 0.5,
    points: [
      { x: 42, y: 28 },  // 0: dot (unconnected)
      { x: 40, y: 48 },  // 1: top of stem
      { x: 38, y: 72 },  // 2: middle
      { x: 35, y: 92 },  // 3: bottom
    ],
    connections: [
      // Dot is unconnected - a nice constellation detail!
      [1, 2], [2, 3], // Stem only
    ],
  },

  // Lowercase u - 5 points, U shape
  u: {
    width: 0.8,
    points: [
      { x: 22, y: 42 },  // 0: top left
      { x: 25, y: 70 },  // 1: mid left
      { x: 38, y: 90 },  // 2: bottom left
      { x: 62, y: 88 },  // 3: bottom right
      { x: 75, y: 60 },  // 4: top right (continues up)
    ],
    connections: [
      [0, 1], [1, 2], [2, 3], [3, 4],
    ],
  },

  // Space character (no points)
  ' ': {
    width: 0.6,
    points: [],
    connections: [],
  },
};

// Combined constellation data for positioned text
export interface PositionedConstellation {
  allPoints: {
    x: number;
    y: number;
    letterIndex: number;
    pointIndex: number;
  }[];
  allConnections: {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    letterIndex: number;
  }[];
  totalWidth: number;
  totalHeight: number;
}

/**
 * Converts a text string into positioned constellation points and connections
 * @param text - The text to convert (e.g., "Portal Espiritual")
 * @param letterSpacing - Space between letters (relative units)
 * @param wordSpacing - Additional space between words (relative units)
 * @returns Combined constellation data with absolute positions
 */
export function getTextConstellation(
  text: string,
  letterSpacing: number = 15,
  wordSpacing: number = 40
): PositionedConstellation {
  const allPoints: PositionedConstellation['allPoints'] = [];
  const allConnections: PositionedConstellation['allConnections'] = [];

  let currentX = 0;
  const baseHeight = 100;

  text.split('').forEach((char, letterIndex) => {
    const letterData = LETTER_CONSTELLATIONS[char];

    if (!letterData) {
      console.warn(`No constellation data for character: "${char}"`);
      return;
    }

    // Calculate letter width (base 100 units * width factor)
    const letterWidth = 100 * letterData.width;

    // Add all points for this letter with absolute positions
    letterData.points.forEach((point, pointIndex) => {
      allPoints.push({
        x: currentX + point.x * letterData.width,
        y: point.y,
        letterIndex,
        pointIndex,
      });
    });

    // Add all connections for this letter with absolute positions
    const pointOffset = allPoints.length - letterData.points.length;
    letterData.connections.forEach(([fromIdx, toIdx]) => {
      const fromPoint = allPoints[pointOffset + fromIdx];
      const toPoint = allPoints[pointOffset + toIdx];

      allConnections.push({
        fromX: fromPoint.x,
        fromY: fromPoint.y,
        toX: toPoint.x,
        toY: toPoint.y,
        letterIndex,
      });
    });

    // Move to next letter position
    currentX += letterWidth + letterSpacing;

    // Add extra space after spaces (for word breaks)
    if (char === ' ') {
      currentX += wordSpacing;
    }
  });

  return {
    allPoints,
    allConnections,
    totalWidth: currentX,
    totalHeight: baseHeight,
  };
}

/**
 * Converts two lines of text into positioned constellation points and connections
 * Each line is independently centered horizontally
 * @param line1 - First line of text (e.g., "Portal")
 * @param line2 - Second line of text (e.g., "Espiritual")
 * @param letterSpacing - Space between letters (relative units)
 * @param lineGap - Vertical space between the two lines (relative units)
 * @returns Combined constellation data with absolute positions for both lines
 */
export function getTwoLineConstellation(
  line1: string,
  line2: string,
  letterSpacing: number = 15,
  lineGap: number = 40
): PositionedConstellation {
  const allPoints: PositionedConstellation['allPoints'] = [];
  const allConnections: PositionedConstellation['allConnections'] = [];

  const baseHeight = 100;
  let globalLetterIndex = 0;

  // Process line 1
  const line1Data = getTextConstellation(line1, letterSpacing, 0);

  // Process line 2
  const line2Data = getTextConstellation(line2, letterSpacing, 0);

  // Calculate max width to determine centering offsets
  const maxWidth = Math.max(line1Data.totalWidth, line2Data.totalWidth);

  // Center line 1 horizontally
  const line1OffsetX = (maxWidth - line1Data.totalWidth) / 2;

  // Add line 1 points with centering offset
  line1Data.allPoints.forEach((point) => {
    allPoints.push({
      x: point.x + line1OffsetX,
      y: point.y,
      letterIndex: globalLetterIndex++,
      pointIndex: point.pointIndex,
    });
  });

  // Add line 1 connections with centering offset
  line1Data.allConnections.forEach((conn) => {
    allConnections.push({
      fromX: conn.fromX + line1OffsetX,
      fromY: conn.fromY,
      toX: conn.toX + line1OffsetX,
      toY: conn.toY,
      letterIndex: conn.letterIndex,
    });
  });

  // Center line 2 horizontally and position it below line 1
  const line2OffsetX = (maxWidth - line2Data.totalWidth) / 2;
  const line2OffsetY = baseHeight + lineGap;

  // Add line 2 points with centering offset and vertical offset
  line2Data.allPoints.forEach((point) => {
    allPoints.push({
      x: point.x + line2OffsetX,
      y: point.y + line2OffsetY,
      letterIndex: globalLetterIndex++,
      pointIndex: point.pointIndex,
    });
  });

  // Add line 2 connections with centering offset and vertical offset
  line2Data.allConnections.forEach((conn) => {
    allConnections.push({
      fromX: conn.fromX + line2OffsetX,
      fromY: conn.fromY + line2OffsetY,
      toX: conn.toX + line2OffsetX,
      toY: conn.toY + line2OffsetY,
      letterIndex: conn.letterIndex + line1.length,
    });
  });

  return {
    allPoints,
    allConnections,
    totalWidth: maxWidth,
    totalHeight: line2OffsetY + baseHeight,
  };
}
