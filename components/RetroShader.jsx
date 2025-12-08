'use client'

import { useMemo } from 'react'
import { Effect } from 'postprocessing'

// Custom retro shader effect with pixelation and dithering
class RetroEffect extends Effect {
  constructor({ pixelSize = 3, ditherIntensity = 0.4 } = {}) {
    const fragmentShader = `
uniform float pixelSize;
uniform float ditherIntensity;

float ditherPattern(vec2 uv) {
  // Use a smoother noise-based dithering instead of a grid pattern
  vec2 p = uv * 8.0;
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smoothstep
  float a = dot(i, vec2(1.0, 57.0));
  float b = dot(i + vec2(1.0, 0.0), vec2(1.0, 57.0));
  float c = dot(i + vec2(0.0, 1.0), vec2(1.0, 57.0));
  float d = dot(i + vec2(1.0, 1.0), vec2(1.0, 57.0));
  float noise = mix(
    mix(fract(sin(a) * 43758.5453), fract(sin(b) * 43758.5453), f.x),
    mix(fract(sin(c) * 43758.5453), fract(sin(d) * 43758.5453), f.x),
    f.y
  );
  return noise;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 resolution = vec2(textureSize(inputBuffer, 0));
  vec2 pixelatedUV = floor(uv * resolution / pixelSize) * pixelSize / resolution;
  vec4 color = texture(inputBuffer, pixelatedUV);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float dither = ditherPattern(pixelatedUV) - 0.5;
  gray = gray + dither * ditherIntensity;
  // Use more quantization levels (8 instead of 4) for less contrast
  float quantized = floor(gray * 8.0) / 7.0;
  quantized = clamp(quantized, 0.0, 1.0);
  outputColor = vec4(vec3(quantized), color.a);
}
    `.trim()

    super('RetroEffect', fragmentShader, {
      uniforms: new Map([
        ['pixelSize', { value: pixelSize }],
        ['ditherIntensity', { value: ditherIntensity }],
      ]),
    })
  }
}

export default function RetroShader({ pixelSize = 3, ditherIntensity = 0.4 }) {
  const effect = useMemo(() => new RetroEffect({ pixelSize, ditherIntensity }), [pixelSize, ditherIntensity])
  return <primitive object={effect} />
}

