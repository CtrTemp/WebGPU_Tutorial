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
fn main(
  @location(0) position : vec4<f32>,
  @location(1) uv : vec2<f32>
) -> VertexOutput {
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
// 这里注意 myTexture 的类型是 texture_cube ,而一般的 texture 被定一个为 texture_2d 类型
@group(0) @binding(2) var myTexture: texture_cube<f32>;

@fragment
fn main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  // Our camera and the skybox cube are both centered at (0, 0, 0)
  // so we can use the cube geomtry position to get viewing vector to sample the cube texture.
  // The magnitude of the vector doesn't matter.
  var cubemapVec = fragPosition.xyz - vec3(0.5);  // 这句应该怎么理解？？？？
  return textureSample(myTexture, mySampler, cubemapVec);
}
`


export{ vertex_shader, fragment_shader }
