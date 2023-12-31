// Vertex Shader
const vertex_shader = /* wgsl */`
struct Uniforms {
  modelViewProjectionMatrix : mat4x4<f32>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn main(@location(0) position : vec4<f32>, @location(1) uv : vec2<f32>) -> VertexOutput 
{
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix * position;
  output.fragUV = uv;
  output.fragPosition = 0.5 * (position + vec4(1.0, 1.0, 1.0, 1.0));
  return output;
}

`

// Fragment Shader
const fragment_shader = /* wgsl */`
@group(0) @binding(1) var mySampler: sampler;
@group(0) @binding(2) var myTexture: texture_2d<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  // WGSL 中默认的采样函数。我们只需要为其指定对应的texture、采样方法、UV值即可得到某个点的采样值（颜色）
  return textureSample(myTexture, mySampler, fragUV) * fragPosition;
}
`


export{ vertex_shader, fragment_shader }
