// Vertex Shader
const vertex_shader = /* wgsl */`
struct Uniforms {
  modelViewProjectionMatrix : array<mat4x4<f32>, 16>,
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  @location(0) fragUV : vec2<f32>,
  @location(1) fragPosition: vec4<f32>,
}

@vertex
fn main(@builtin(instance_index) instanceIdx : u32, @location(0) position : vec4<f32>, @location(1) uv : vec2<f32>) -> VertexOutput 
{
  // 这里通过绘制实例的序号来确定在 MVP 矩阵数组中的 offset，从而确定当前实例应该应用哪一个MVP矩阵
  var output : VertexOutput;
  output.Position = uniforms.modelViewProjectionMatrix[instanceIdx] * position;
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
  return textureSample(myTexture, mySampler, fragUV);
}
`


export{ vertex_shader, fragment_shader }
