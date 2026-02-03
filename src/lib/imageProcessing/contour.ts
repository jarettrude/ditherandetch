/**
 * Contour/Outline Detection Module
 *
 * Extract outlines from images for laser cutting paths.
 * Converts images to SVG vector outlines.
 */

import { getGrayOnWhite } from './alpha';
import type { ProcessingImageData } from './types';

/**
 * Extract contours from an image using edge detection
 */
export function extractContours(
  imageData: ProcessingImageData,
  threshold: number = 128,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);

  // Fill with white
  result.fill(255);

  // Convert to grayscale and threshold
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const gray = getGrayOnWhite(data, idx);
    binary[i] = gray < threshold ? 1 : 0;
  }

  // Find edges (pixels that are black with at least one white neighbor)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      if (binary[idx] === 1) {
        // Check 4-connected neighbors
        const hasWhiteNeighbor =
          binary[idx - 1] === 0
          || binary[idx + 1] === 0
          || binary[idx - width] === 0
          || binary[idx + width] === 0;

        if (hasWhiteNeighbor) {
          const pixelIdx = idx * 4;
          result[pixelIdx]! = 0;
          result[pixelIdx + 1]! = 0;
          result[pixelIdx + 2]! = 0;
          result[pixelIdx + 3]! = 255;
        }
      }
    }
  }

  return { width, height, data: result };
}

/**
 * Trace contours and convert to SVG path
 */
export function contourToSVG(
  imageData: ProcessingImageData,
  threshold: number = 128,
  options?: {
    simplifyEpsilon?: number;
    smoothIterations?: number;
    minPathLength?: number;
    offsetPx?: number;
  },
): string {
  const { width, height, data } = imageData;
  const simplifyEpsilon = options?.simplifyEpsilon ?? 1.0;
  const smoothIterations = options?.smoothIterations ?? 0;
  const minPathLength = options?.minPathLength ?? 0;
  const offsetPx = options?.offsetPx ?? 0;

  // Convert to binary
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const gray = getGrayOnWhite(data, idx);
    binary[i] = gray < threshold ? 1 : 0;
  }

  if (offsetPx !== 0) {
    const radius = Math.min(50, Math.abs(Math.trunc(offsetPx)));
    if (radius > 0) {
      const morphed =
        offsetPx > 0 ?
          dilateBinary(binary, width, height, radius)
        : erodeBinary(binary, width, height, radius);
      binary.set(morphed);
    }
  }

  const edges: { a: string; b: string; used: boolean }[] = [];
  const adjacency = new Map<string, { edgeIndex: number; other: string }[]>();

  const addEdge = (a: string, b: string) => {
    const edgeIndex = edges.length;
    edges.push({ a, b, used: false });
    const aList = adjacency.get(a);
    if (aList) aList.push({ edgeIndex, other: b });
    else adjacency.set(a, [{ edgeIndex, other: b }]);
    const bList = adjacency.get(b);
    if (bList) bList.push({ edgeIndex, other: a });
    else adjacency.set(b, [{ edgeIndex, other: a }]);
  };

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = binary[y * width + x]!;
      const tr = binary[y * width + x + 1]!;
      const bl = binary[(y + 1) * width + x]!;
      const br = binary[(y + 1) * width + x + 1]!;

      const config = (tl << 3) | (tr << 2) | (br << 1) | bl;
      if (config === 0 || config === 15) continue;

      const segments = getMarchingSquaresSegments(x, y, config);
      for (const seg of segments) addEdge(seg[0]!, seg[1]!);
    }
  }

  const polylines: { keys: string[]; closed: boolean }[] = [];

  const traceFrom = (startKey: string) => {
    while (true) {
      const startAdj = adjacency.get(startKey);
      const nextStart = startAdj?.find(e => !edges[e.edgeIndex]!.used);
      if (!nextStart) break;

      const keys: string[] = [startKey];
      let current = startKey;
      let prevEdgeIndex = -1;
      let closed = false;

      while (true) {
        const adj = adjacency.get(current);
        if (!adj) break;
        let next = adj.find(
          e => !edges[e.edgeIndex]!.used && e.edgeIndex !== prevEdgeIndex,
        );
        if (!next) next = adj.find(e => !edges[e.edgeIndex]!.used);
        if (!next) break;

        const edge = edges[next.edgeIndex]!;
        edge.used = true;
        prevEdgeIndex = next.edgeIndex;
        current = next.other;
        keys.push(current);
        if (current === startKey) {
          closed = true;
          break;
        }
      }

      if (keys.length >= 2) {
        polylines.push({ keys, closed });
      }
    }
  };

  for (const [key, neighbors] of adjacency.entries()) {
    if (neighbors.length !== 2) traceFrom(key);
  }

  for (const edge of edges) {
    if (!edge.used) traceFrom(edge.a);
  }

  const formatNum = (n: number) => {
    if (Number.isInteger(n)) return String(n);
    return String(Number(n.toFixed(2)));
  };

  const keyToPoint = (key: string): { x: number; y: number } => {
    const comma = key.indexOf(',');
    const x2 = Number(key.slice(0, comma));
    const y2 = Number(key.slice(comma + 1));
    return { x: x2 / 2, y: y2 / 2 };
  };

  const polylineLength = (pts: { x: number; y: number }[]) => {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i]!;
      const p0 = pts[i - 1]!;
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      len += Math.hypot(dx, dy);
    }
    return len;
  };

  const chaikin = (
    pts: { x: number; y: number }[],
    closed: boolean,
    iterations: number,
  ) => {
    let out = pts;
    for (let it = 0; it < iterations; it++) {
      if (out.length < 3) return out;
      const next: { x: number; y: number }[] = [];
      if (!closed) next.push(out[0]!);
      const n = out.length;
      const last = closed ? n : n - 1;
      for (let i = 0; i < last - 1; i++) {
        const p0 = out[i]!;
        const p1 = out[(i + 1) % n]!;
        next.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        });
        next.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        });
      }
      if (closed) {
        const p0 = out[n - 1]!;
        const p1 = out[0]!;
        next.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        });
        next.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        });
      } else {
        next.push(out[n - 1]!);
      }
      out = next;
    }
    return out;
  };

  const svgSubpaths: string[] = [];

  for (const poly of polylines) {
    const rawPoints = poly.keys.map(keyToPoint);
    if (minPathLength > 0 && polylineLength(rawPoints) < minPathLength)
      continue;

    const isClosed = poly.closed;
    let points = rawPoints;
    if (isClosed && points.length > 2) {
      const first = points[0]!;
      const last = points[points.length - 1]!;
      if (first.x === last.x && first.y === last.y) {
        points = points.slice(0, -1);
      }
    }

    if (simplifyEpsilon > 0 && points.length > 2) {
      points = simplifyPath(points, simplifyEpsilon);
    }

    if (smoothIterations > 0 && points.length > 2) {
      points = chaikin(points, isClosed, smoothIterations);
      if (simplifyEpsilon > 0 && points.length > 2) {
        points = simplifyPath(points, simplifyEpsilon);
      }
    }

    if (points.length < 2) continue;

    const firstPoint = points[0]!;
    const dParts: string[] = [
      `M${formatNum(firstPoint.x)},${formatNum(firstPoint.y)}`,
    ];
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      dParts.push(`L${formatNum(p.x)},${formatNum(p.y)}`);
    }
    if (isClosed) dParts.push('Z');
    svgSubpaths.push(dParts.join(' '));
  }

  const d = svgSubpaths.join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <path d="${d}" fill="none" stroke="black" stroke-width="1"/>
</svg>`;
}

function dilateBinary(
  binary: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hasBlack = false;
      for (let dy = -radius; dy <= radius && !hasBlack; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius && !hasBlack; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          if (binary[ny * width + nx] === 1) hasBlack = true;
        }
      }
      out[y * width + x]! = hasBlack ? 1 : 0;
    }
  }
  return out;
}

function erodeBinary(
  binary: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const out = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allBlack = true;
      for (let dy = -radius; dy <= radius && allBlack; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) {
          allBlack = false;
          break;
        }
        for (let dx = -radius; dx <= radius && allBlack; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) {
            allBlack = false;
            break;
          }
          if (binary[ny * width + nx] !== 1) allBlack = false;
        }
      }
      out[y * width + x]! = allBlack ? 1 : 0;
    }
  }
  return out;
}

function getMarchingSquaresSegments(
  x: number,
  y: number,
  config: number,
): [string, string][] {
  const midTop = `${x * 2 + 1},${y * 2}`;
  const midRight = `${x * 2 + 2},${y * 2 + 1}`;
  const midBottom = `${x * 2 + 1},${y * 2 + 2}`;
  const midLeft = `${x * 2},${y * 2 + 1}`;

  switch (config) {
    case 1:
    case 14:
      return [[midLeft, midBottom]];
    case 2:
    case 13:
      return [[midBottom, midRight]];
    case 3:
    case 12:
      return [[midLeft, midRight]];
    case 4:
    case 11:
      return [[midTop, midRight]];
    case 5:
      return [
        [midLeft, midTop],
        [midBottom, midRight],
      ];
    case 6:
    case 9:
      return [[midTop, midBottom]];
    case 7:
    case 8:
      return [[midLeft, midTop]];
    case 10:
      return [
        [midTop, midRight],
        [midLeft, midBottom],
      ];
    default:
      return [];
  }
}

/**
 * Simplify contour path using Douglas-Peucker algorithm
 */
export function simplifyPath(
  points: { x: number; y: number }[],
  epsilon: number = 1.0,
): { x: number; y: number }[] {
  if (points.length < 3) return points;

  // Find point with maximum distance from line between first and last
  let maxDist = 0;
  let maxIdx = 0;

  const first = points[0]!;
  const last = points[points.length - 1]!;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i]!, first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2,
    );
  }

  const t =
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy)
    / (dx * dx + dy * dy);
  const nearestX = lineStart.x + t * dx;
  const nearestY = lineStart.y + t * dy;

  return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2);
}

/**
 * Dilate contour (make lines thicker)
 */
export function dilateContour(
  imageData: ProcessingImageData,
  radius: number = 1,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);
  result.fill(255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Check if any pixel in radius is black
      let hasBlack = false;
      for (let dy = -radius; dy <= radius && !hasBlack; dy++) {
        for (let dx = -radius; dx <= radius && !hasBlack; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            if (data[nIdx]! < 128) {
              hasBlack = true;
            }
          }
        }
      }

      if (hasBlack) {
        result[idx]! = 0;
        result[idx + 1]! = 0;
        result[idx + 2]! = 0;
      }
      result[idx + 3]! = 255;
    }
  }

  return { width, height, data: result };
}

/**
 * Erode contour (make lines thinner)
 */
export function erodeContour(
  imageData: ProcessingImageData,
  radius: number = 1,
): ProcessingImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);
  result.fill(255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Only keep black if all pixels in radius are black
      let allBlack = true;
      for (let dy = -radius; dy <= radius && allBlack; dy++) {
        for (let dx = -radius; dx <= radius && allBlack; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            if (data[nIdx]! >= 128) {
              allBlack = false;
            }
          } else {
            allBlack = false;
          }
        }
      }

      if (allBlack) {
        result[idx]! = 0;
        result[idx + 1]! = 0;
        result[idx + 2]! = 0;
      }
      result[idx + 3]! = 255;
    }
  }

  return { width, height, data: result };
}

/**
 * Canny edge detection algorithm
 */
export function cannyEdgeDetection(
  imageData: ProcessingImageData,
  lowThreshold: number = 50,
  highThreshold: number = 150,
): ProcessingImageData {
  const { width, height, data } = imageData;

  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    gray[i]! = getGrayOnWhite(data, idx);
  }

  // Apply Gaussian blur (3x3 kernel)
  const blurred = new Float32Array(width * height);
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];
  const kernelSum = 16;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * width + (x + dx)]! * kernel[k++]!;
        }
      }
      blurred[y * width + x]! = sum / kernelSum;
    }
  }

  // Compute gradients using Sobel operators
  const magnitude = new Float32Array(width * height);
  const direction = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Sobel X
      const gx =
        -blurred[(y - 1) * width + (x - 1)]!
        + blurred[(y - 1) * width + (x + 1)]!
        + -2 * blurred[y * width + (x - 1)]!
        + 2 * blurred[y * width + (x + 1)]!
        + -blurred[(y + 1) * width + (x - 1)]!
        + blurred[(y + 1) * width + (x + 1)]!;

      // Sobel Y
      const gy =
        -blurred[(y - 1) * width + (x - 1)]!
        - 2 * blurred[(y - 1) * width + x]!
        - blurred[(y - 1) * width + (x + 1)]!
        + blurred[(y + 1) * width + (x - 1)]!
        + 2 * blurred[(y + 1) * width + x]!
        + blurred[(y + 1) * width + (x + 1)]!;

      magnitude[idx]! = Math.sqrt(gx * gx + gy * gy);
      direction[idx]! = Math.atan2(gy, gx);
    }
  }

  // Non-maximum suppression
  const suppressed = new Float32Array(width * height);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const angle = direction[idx]!;
      const mag = magnitude[idx]!;

      let neighbor1 = 0,
        neighbor2 = 0;
      const absAngle = Math.abs(angle);

      if (absAngle < Math.PI / 8 || absAngle > (7 * Math.PI) / 8) {
        neighbor1 = magnitude[idx - 1]!;
        neighbor2 = magnitude[idx + 1]!;
      } else if (absAngle < (3 * Math.PI) / 8) {
        neighbor1 = magnitude[(y - 1) * width + (x + 1)]!;
        neighbor2 = magnitude[(y + 1) * width + (x - 1)]!;
      } else if (absAngle < (5 * Math.PI) / 8) {
        neighbor1 = magnitude[(y - 1) * width + x]!;
        neighbor2 = magnitude[(y + 1) * width + x]!;
      } else {
        neighbor1 = magnitude[(y - 1) * width + (x - 1)]!;
        neighbor2 = magnitude[(y + 1) * width + (x + 1)]!;
      }

      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx]! = mag;
      }
    }
  }

  // Double threshold and hysteresis
  const edgesOutput = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (suppressed[idx]! >= highThreshold) {
        edgesOutput[idx]! = 2;
      } else if (suppressed[idx]! >= lowThreshold) {
        edgesOutput[idx]! = 1;
      }
    }
  }

  // Hysteresis
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (edgesOutput[idx] === 1) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (edgesOutput[(y + dy) * width + (x + dx)] === 2) {
                edgesOutput[idx]! = 2;
                changed = true;
                break;
              }
            }
            if (edgesOutput[idx] === 2) break;
          }
        }
      }
    }
  }

  // Create output
  const result = new Uint8ClampedArray(width * height * 4);
  result.fill(255);

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    if (edgesOutput[i] === 2) {
      result[idx]! = 0;
      result[idx + 1]! = 0;
      result[idx + 2]! = 0;
    }
    result[idx + 3]! = 255;
  }

  return { width, height, data: result };
}
