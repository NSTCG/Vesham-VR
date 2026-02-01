#define USE_MATERIAL_ID
#define USE_NDC_COORDINATES

#define FEATURE_TONEMAPPING

#include "lib/Compatibility.wgsl"

#define USE_MATERIAL_INDEX
#include "lib/Uniforms.wgsl"

struct Material {
    direction: vec3<f16>,
    exposure: f16,
};

#include "lib/Packing.wgsl"
#include "lib/Materials.wgsl"

fn decodeMaterial(matIndex: u32) -> Material {
    {{decoder}}
    return mat;
}

#include "lib/Quaternion.wgsl"
#include "lib/Math.wgsl"
#include "lib/CoordinateSystems.wgsl"
#include "lib/Color.wgsl"

// ============================================
// ANIME NIGHT SKY SHADER (WGSL)
// ============================================

// Hash function for procedural stars
fn hash2(p: vec2<f32>) -> f32 {
    return fract(sin(dot(p, vec2<f32>(127.1, 311.7))) * 43758.5453);
}

// 2D noise for subtle variation
fn noise2d(p: vec2<f32>) -> f32 {
    let i: vec2<f32> = floor(p);
    var f: vec2<f32> = fract(p);
    f = f * f * (3.0 - 2.0 * f); // Smoothstep
    
    let a: f32 = hash2(i);
    let b: f32 = hash2(i + vec2<f32>(1.0, 0.0));
    let c: f32 = hash2(i + vec2<f32>(0.0, 1.0));
    let d: f32 = hash2(i + vec2<f32>(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Starfield function
fn starField(dir: vec3<f32>, density: f32, brightness: f32) -> f32 {
    // Project direction onto a sphere grid
    let uv: vec2<f32> = vec2<f32>(atan2(dir.z, dir.x), asin(clamp(dir.y, -1.0, 1.0))) * density;
    
    // Grid cell
    let cell: vec2<f32> = floor(uv);
    let cellUV: vec2<f32> = fract(uv) - 0.5;
    
    // Random offset within cell
    let starPosX: f32 = (hash2(cell) - 0.5) * 0.8;
    let starPosY: f32 = (hash2(cell + vec2<f32>(42.0, 17.0)) - 0.5) * 0.8;
    let starPos: vec2<f32> = vec2<f32>(starPosX, starPosY);
    
    // Distance to star center
    let dist: f32 = length(cellUV - starPos);
    
    // Star intensity with soft falloff
    let starBrightness: f32 = hash2(cell + vec2<f32>(123.0, 456.0));
    let star: f32 = smoothstep(0.05, 0.0, dist) * starBrightness * brightness;
    
    // Only show some stars (not all cells have visible stars)
    let visible: f32 = step(0.7, hash2(cell + vec2<f32>(789.0, 321.0)));
    
    return star * visible;
}

// Twinkling effect based on direction
fn twinkle(dir: vec3<f32>, speed: f32) -> f32 {
    let t: f32 = hash2(dir.xy * 100.0) * 6.28318;
    // Pseudo-animation using direction variance
    let twinkleVal: f32 = sin(t + dir.x * 50.0 + dir.z * 50.0) * 0.5 + 0.5;
    return mix(0.5, 1.0, twinkleVal);
}

// Performant cloud noise (2 octaves only for performance)
fn cloudNoise(uv: vec2<f32>) -> f32 {
    var n: f32 = 0.0;
    n = n + noise2d(uv * 1.0) * 0.5;
    n = n + noise2d(uv * 2.0) * 0.25;
    return n * 1.33; // Normalize back to ~0-1 range
}

// Cloud layer function
fn cloudsLayer(dir: vec3<f32>, scale: f32, coverage: f32) -> f32 {
    // Project to 2D using spherical coordinates
    let uv: vec2<f32> = vec2<f32>(atan2(dir.z, dir.x) * 0.5, dir.y * 2.0) * scale;
    
    let n: f32 = cloudNoise(uv);
    
    // Apply coverage threshold (higher coverage = more clouds)
    let c: f32 = smoothstep(1.0 - coverage, 1.0 - coverage + 0.3, n);
    
    return c;
}

@fragment
fn main(
    @location(0) ndcCoordinates: vec2<f32>
) -> @location(0) vec4<f32> {

    let unprojPoint: vec3<f32> = (inverseProjectionMatrix * vec4(ndcCoordinates, 0.0, 1.0)).xyz;
    let direction: vec3<f32> = normalize(quat_transformVector(viewToWorld[0], unprojPoint));

    let mat: Material = decodeMaterial(drawUniforms.materialIndex);

    // ========================================
    // Night Sky Color Gradient
    // ========================================
    let heightFactor: f32 = clamp(direction.y, 0.0, 1.0);
    
    // Anime style blue-green palette
    let horizonColor: vec3<f32> = vec3<f32>(0.06, 0.14, 0.18);   // Teal/green tint
    let midColor: vec3<f32> = vec3<f32>(0.04, 0.10, 0.14);       // Deep teal-navy
    let zenithColor: vec3<f32> = vec3<f32>(0.01, 0.04, 0.06);    // Near black with green-blue tint
    
    // Two-stage gradient for more control
    var skyColor: vec3<f32>;
    if (heightFactor < 0.3) {
        skyColor = mix(horizonColor, midColor, heightFactor / 0.3);
    } else {
        skyColor = mix(midColor, zenithColor, (heightFactor - 0.3) / 0.7);
    }
    
    // Add subtle green-cyan tint for anime feel
    skyColor = skyColor + vec3<f32>(0.0, 0.03, 0.02) * (1.0 - heightFactor);
    
    // ========================================
    // Stars
    // ========================================
    var stars: f32 = 0.0;
    
    // Dense small stars
    stars = stars + starField(direction, 80.0, 0.6);
    
    // Medium stars
    stars = stars + starField(direction, 40.0, 0.9);
    
    // Sparse bright stars
    stars = stars + starField(direction, 20.0, 1.2);
    
    // Apply twinkling
    stars = stars * twinkle(direction, 1.0);
    
    // Star color (warm white with slight blue tint)
    let starColor: vec3<f32> = vec3<f32>(0.95, 0.95, 1.0);
    
    // Fade stars near horizon (atmospheric effect)
    let horizonFade: f32 = smoothstep(0.0, 0.15, direction.y);
    stars = stars * horizonFade;
    
    // ========================================
    // Clouds (performant 2-layer)
    // ========================================
    let cloudLayer1: f32 = cloudsLayer(direction, 3.0, 0.4);  // Large wispy clouds
    let cloudLayer2: f32 = cloudsLayer(direction, 6.0, 0.3);  // Smaller detail clouds
    var cloudAmount: f32 = cloudLayer1 * 0.7 + cloudLayer2 * 0.3;
    
    // Fade clouds near horizon (more clouds mid-sky)
    let cloudHeightFade: f32 = smoothstep(0.0, 0.2, direction.y) * smoothstep(1.0, 0.5, direction.y);
    cloudAmount = cloudAmount * cloudHeightFade;
    
    // Cloud color (dark with slight green-blue tint for night)
    let cloudColor: vec3<f32> = vec3<f32>(0.08, 0.12, 0.14);
    
    // ========================================
    // Atmospheric Haze at Horizon
    // ========================================
    let hazeAmount: f32 = 1.0 - smoothstep(0.0, 0.2, abs(direction.y));
    let hazeColor: vec3<f32> = vec3<f32>(0.08, 0.14, 0.16);
    
    // ========================================
    // Combine
    // ========================================
    var color: vec3<f32> = skyColor;
    
    // Stars are occluded by clouds
    let starOcclusion: f32 = 1.0 - cloudAmount * 0.8;
    color = color + starColor * stars * starOcclusion;
    
    // Blend in clouds
    color = mix(color, cloudColor, cloudAmount * 0.6);
    
    // Haze on top
    color = mix(color, hazeColor, hazeAmount * 0.4);
    
    // Apply exposure
    color = color * f32(mat.exposure);

    #ifdef TONEMAPPING
    color = color * cameraParams.y;
    color = tonemap(color);
    #endif

    return vec4<f32>(linearToSrgb3(color), 1.0);
}
