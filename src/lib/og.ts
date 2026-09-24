import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

type VNode = {
  type: string;
  props: Record<string, unknown> & { children?: unknown };
};

function h(type: string, props: Record<string, unknown>, children?: unknown): VNode {
  return { type, props: { ...props, children } };
}

function loadFont(fileName: string): Buffer {
  // Astro runs this at build time; cwd is the project root.
  try {
    return readFileSync(resolve(process.cwd(), 'src/assets/fonts', fileName));
  } catch {
    return readFileSync(fileURLToPath(new URL(`../assets/fonts/${fileName}`, import.meta.url)));
  }
}

const regular = loadFont('inter-400.woff');
const bold = loadFont('inter-700.woff');

export interface OgOptions {
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: string;
}

export async function renderOgPng(options: OgOptions): Promise<Buffer> {
  const { title, subtitle, badge, accent = '#3363ff' } = options;

  const tree = h(
    'div',
    {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        background: 'linear-gradient(135deg, #0b1220 0%, #101a33 55%, #0b1220 100%)',
        fontFamily: 'Inter',
        color: '#ffffff',
      },
    },
    [
      h(
        'div',
        { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
        [
          h('div', {
            style: {
              width: '48px',
              height: '32px',
              borderRadius: '8px',
              background: accent,
              display: 'flex',
            },
          }),
          h(
            'div',
            { style: { fontSize: '28px', fontWeight: 700, display: 'flex' } },
            'CryptoCards.biz',
          ),
        ],
      ),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', gap: '20px' } },
        [
          badge
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: '22px',
                    fontWeight: 700,
                    color: accent,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  },
                },
                badge,
              )
            : null,
          h(
            'div',
            { style: { display: 'flex', fontSize: '64px', fontWeight: 700, lineHeight: 1.1 } },
            title,
          ),
          subtitle
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    fontSize: '28px',
                    color: '#94a3b8',
                    lineHeight: 1.35,
                    maxWidth: '960px',
                  },
                },
                subtitle,
              )
            : null,
        ].filter(Boolean),
      ),
      h(
        'div',
        { style: { display: 'flex', fontSize: '24px', color: '#64748b' } },
        'Independent crypto card reviews, fees and comparisons',
      ),
    ].filter(Boolean),
  );

  const svg = await satori(tree as never, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: bold, weight: 700, style: 'normal' },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
  return resvg.render().asPng();
}

export function truncate(value: string, max = 160): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
