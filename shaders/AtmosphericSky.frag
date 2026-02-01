precision highp float;

#define USE_MATERIAL_ID

#define FEATURE_TONEMAPPING

#define USE_MATERIAL_INDEX
#include "lib/Uniforms.glsl"

#define USE_NDC_COORDINATES
in highp vec2 ndcCoordinates;

out lowp vec4 outColor;

struct Material {
    lowp vec3 direction;
    lowp float exposure;
};

#include "lib/Packing.glsl"
#include "lib/Materials.glsl"

Material decodeMaterial(uint matIndex) {
    {{decoder}}
    return mat;
}

#include "lib/Quaternion.glsl"
#include "lib/Math.glsl"
#include "lib/CoordinateSystems.glsl"
#include "lib/Color.glsl"

// ============================================
// ANIME NIGHT SKY SHADER
// ============================================

// Hash function for procedural stars
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D noise for subtle variation
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Starfield function
float starField(vec3 dir, float density, float brightness) {
    // Project direction onto a sphere grid
    vec2 uv = vec2(atan(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0)));
    uv *= density;
    
    // Grid cell
    vec2 cell = floor(uv);
    vec2 cellUV = fract(uv) - 0.5;
    
    // Random offset within cell
    float starPosX = (hash(cell) - 0.5) * 0.8;
    float starPosY = (hash(cell + vec2(42.0, 17.0)) - 0.5) * 0.8;
    vec2 starPos = vec2(starPosX, starPosY);

    
    // Distance to star center
    float dist = length(cellUV - starPos);
    
    // Star intensity with soft falloff
    float starBrightness = hash(cell + vec2(123.0, 456.0));
    float star = smoothstep(0.05, 0.0, dist) * starBrightness * brightness;
    
    // Only show some stars (not all cells have visible stars)
    float visible = step(0.7, hash(cell + vec2(789.0, 321.0)));
    
    return star * visible;
}

// Twinkling effect based on direction
float twinkle(vec3 dir, float speed) {
    float t = hash(dir.xy * 100.0) * 6.28318;
    // Pseudo-animation using direction variance
    float twinkleVal = sin(t + dir.x * 50.0 + dir.z * 50.0) * 0.5 + 0.5;
    return mix(0.5, 1.0, twinkleVal);
}

// Performant cloud noise (2 octaves only for performance)
float cloudNoise(vec2 uv) {
    float n = 0.0;
    n += noise(uv * 1.0) * 0.5;
    n += noise(uv * 2.0) * 0.25;
    return n * 1.33; // Normalize back to ~0-1 range
}

// Cloud layer function
float clouds(vec3 dir, float scale, float coverage) {
    // Project to 2D using spherical coordinates
    vec2 uv = vec2(atan(dir.z, dir.x) * 0.5, dir.y * 2.0);
    uv *= scale;
    
    float n = cloudNoise(uv);
    
    // Apply coverage threshold (higher coverage = more clouds)
    float c = smoothstep(1.0 - coverage, 1.0 - coverage + 0.3, n);
    
    return c;
}

void main() {
    vec3 unprojPoint = (inverseProjectionMatrix * vec4(ndcCoordinates, 0.0, 1.0)).xyz;
    vec3 direction = normalize(quat_transformVector(viewToWorld[0], unprojPoint));

    Material mat = decodeMaterial(material);

    // ========================================
    // Night Sky Color Gradient
    // ========================================
    // Horizon to Zenith gradient
    float heightFactor = clamp(direction.y, 0.0, 1.0);
    
    // Anime style blue-green palette
    vec3 horizonColor = vec3(0.06, 0.14, 0.18);   // Teal/green tint
    vec3 midColor = vec3(0.04, 0.10, 0.14);       // Deep teal-navy
    vec3 zenithColor = vec3(0.01, 0.04, 0.06);    // Near black with green-blue tint
    
    // Two-stage gradient for more control
    vec3 skyColor;
    if (heightFactor < 0.3) {
        skyColor = mix(horizonColor, midColor, heightFactor / 0.3);
    } else {
        skyColor = mix(midColor, zenithColor, (heightFactor - 0.3) / 0.7);
    }
    
    // Add subtle green-cyan tint for anime feel
    skyColor += vec3(0.0, 0.03, 0.02) * (1.0 - heightFactor);
    
    // ========================================
    // Stars
    // ========================================
    // Multiple star layers for depth
    float stars = 0.0;
    
    // Dense small stars
    stars += starField(direction, 80.0, 0.6);
    
    // Medium stars
    stars += starField(direction, 40.0, 0.9);
    
    // Sparse bright stars
    stars += starField(direction, 20.0, 1.2);
    
    // // Apply twinkling
    // stars *= twinkle(direction, 1.0);
    
    // Star color (warm white with slight blue tint)
    vec3 starColor = vec3(0.4, 0.4, 0.4);
    
    // Fade stars near horizon (atmospheric effect)
    float horizonFade = smoothstep(0.0, 0.15, direction.y);
    stars *= horizonFade;
    
    // ========================================
    // Clouds (performant 2-layer)
    // ========================================
    float cloudLayer1 = clouds(direction, 3.0, 0.4);  // Large wispy clouds
    float cloudLayer2 = clouds(direction, 6.0, 0.3);  // Smaller detail clouds
    float cloudAmount = cloudLayer1 * 5.7 + cloudLayer2 * 5.3;
    
    // Fade clouds near horizon (more clouds mid-sky)
    float cloudHeightFade = smoothstep(0.0, 0.2, direction.y) * smoothstep(1.0, 0.5, direction.y);
    cloudAmount *= cloudHeightFade;
    
    // Cloud color (dark with slight green-blue tint for night)
    vec3 cloudColor = vec3(0.08, 0.12, 0.14);
    
    // ========================================
    // Atmospheric Haze at Horizon
    // ========================================
    float hazeAmount = 1.0 - smoothstep(0.0, 0.2, abs(direction.y));
    vec3 hazeColor = vec3(0.08, 0.14, 0.16);
    
    // ========================================
    // Combine
    // ========================================
    vec3 color = skyColor;
    
    // Stars are occluded by clouds
    float starOcclusion = 1.0 - cloudAmount * 0.8;
    color += starColor * stars * starOcclusion * 0.5;
    
    // Blend in clouds
    color = mix(color, cloudColor, cloudAmount * 0.6);
    
    // Haze on top
    color = mix(color, hazeColor, hazeAmount * 0.4);
    
    // Apply exposure
    color *= mat.exposure;

    #ifdef TONEMAPPING
    color *= cameraParams.y;
    color = tonemap(color);
    #endif

    outColor = vec4(linearToSrgb(color), 1.0);
}
