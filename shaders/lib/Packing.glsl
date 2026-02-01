#ifdef EMULATE_PACKING

/* Input is usually mediump but converted to highp for enough precision up to
 * USHRT_MAX */
highp uint packUnorm2x16(highp vec2 v) {
    highp uvec2 expanded = uvec2(round(clamp(v, 0.0, 1.0)*65535.0));
    return (expanded.x & 0xffffu) | (expanded.y << 16u);
}

highp uint packSnorm2x16(highp vec2 v) {
    /* GLSL int -> uint cast preserves the bit pattern */
    highp uvec2 expanded = uvec2(ivec2(round(clamp(v, -1.0, 1.0)*32767.0)));
    return (expanded.x & 0xffffu) | (expanded.y << 16u);
}

/**
 * Unpack an encoded half float into a float.
 *
 * Taken from the Angle codebase.
 */
float unpackHalf(uint val) {
    uint sign = (val & 0x8000u) << 16;
    int exponent = int((val & 0x7C00u) >> 10);
    uint mantissa = val & 0x03FFu;
    float f32 = 0.0;
    if(exponent == 0)
    {
        if (mantissa != 0u)
        {
            const float scale = 1.0 / (1 << 24);
            f32 = scale * mantissa;
        }
    }
    else if (exponent == 31)
    {
        return uintBitsToFloat(sign | 0x7F800000u | mantissa);
    }
    else
    {
        exponent -= 15;
        float scale;
        if(exponent < 0)
        {
            // The negative unary operator is buggy on OSX.
            // Work around this by using abs instead.
            scale = 1.0 / (1 << abs(exponent));
        }
        else
        {
            scale = 1 << exponent;
        }
        float decimal = 1.0 + float(mantissa) / float(1 << 10);
        f32 = scale * decimal;
    }
    if (sign != 0u)
    {
        f32 = -f32;
    }
    return f32;
}

mediump vec2 unpackHalf2x16(highp uint val) {
    return vec2(unpackHalf(val & 0xFFFFu), unpackHalf(val >> 16u));
}

#endif

highp uvec2 packUnormVector(mediump vec4 v) {
    return uvec2(
        packUnorm2x16(v.xy),
        packUnorm2x16(v.zw)
    );
}

highp uvec2 packSnormVector(mediump vec4 v) {
    return uvec2(
        packSnorm2x16(v.xy),
        packSnorm2x16(v.zw)
    );
}
