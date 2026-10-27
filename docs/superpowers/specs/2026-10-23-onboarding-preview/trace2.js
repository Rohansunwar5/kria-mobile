// Kria mark v2: body traced from a smoothed alpha mask; the ball rebuilt as clean geometry.
// usage: node trace2.js <logo.png> <out.svg> <preview.png>
const Jimp = require('jimp');
const { Potrace } = require('potrace');
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');

const S = 10;
const ORANGE = '#FF5404';
const SEAM = '#3E403D';

const trace = async (img) => {
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  return new Promise((res, rej) => {
    const p = new Potrace({ turdSize: 200, alphaMax: 1.3, optCurve: true, optTolerance: 1.2, threshold: 128, blackOnWhite: true });
    p.loadImage(buf, (err) => (err ? rej(err) : res(p.getPathTag().match(/ d="([^"]+)"/)[1])));
  });
};

(async () => {
  const src = await Jimp.read(process.argv[2]);
  const w = src.bitmap.width, h = src.bitmap.height;
  // The ball is the connected blob containing (49, 9); everything else opaque is the body.
  const alpha = (x, y) => src.bitmap.data[(y * w + x) * 4 + 3];
  const ballPx = new Set([`49,9`]), stack = [[49, 9]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || ballPx.has(`${nx},${ny}`) || alpha(nx, ny) < 60) continue;
      ballPx.add(`${nx},${ny}`); stack.push([nx, ny]);
    }
  }
  console.log('ball pixels', ballPx.size);
  const mask = new Jimp(w, h, 0xffffffff);
  src.scan(0, 0, w, h, function (x, y, i) {
    const a = this.bitmap.data[i + 3];
    const isBall = ballPx.has(`${x},${y}`) || (y <= 17 && x >= 41 && x <= 61 && a < 60);
    const v = isBall ? 255 : 255 - a; // black = shape
    mask.bitmap.data[i] = mask.bitmap.data[i + 1] = mask.bitmap.data[i + 2] = v;
  });
  const big = mask.resize(w * S, h * S, Jimp.RESIZE_BICUBIC).gaussian(4);
  const bodyD = await trace(big);

  // Ball (in 80x70 units, scaled by S): a disc, one seam across it, and the flick off its top right.
  const cx = 49.3 * S, cy = 9.1 * S, r = 7.1 * S;
  const ball = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ORANGE}"/>
    <path d="M ${43.2 * S} ${11.6 * S} Q ${49 * S} ${9.6 * S} ${55.2 * S} ${5.9 * S}" fill="none" stroke="${SEAM}" stroke-width="${1.05 * S}" stroke-linecap="round"/>
    <path d="M ${54.2 * S} ${4.6 * S} Q ${57 * S} ${3.9 * S} ${59.6 * S} ${4.0 * S} Q ${58.2 * S} ${5.9 * S} ${56.3 * S} ${7.6 * S} Z" fill="${ORANGE}"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * S} ${h * S}">
  <g id="body"><path fill="${ORANGE}" d="${bodyD}"/></g>
  <g id="ball">${ball}</g>
</svg>
`;
  fs.writeFileSync(process.argv[3], svg);
  const render = (width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, background: '#0B0B0D' }).render().asPng();
  fs.writeFileSync(process.argv[4], render(640));
  fs.writeFileSync(process.argv[4].replace('.png', '-112.png'), render(112));
  console.log('svg bytes', svg.length);
})();
