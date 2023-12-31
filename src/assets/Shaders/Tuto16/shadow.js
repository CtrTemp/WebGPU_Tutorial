// Vertex Shader
const shadow_vert = /* wgsl */`

// 在shadow的shader中，只需要使用其中的 lightViewProjMatrix 分量
struct Scene {
    lightViewProjMatrix: mat4x4<f32>,
    cameraViewProjMatrix: mat4x4<f32>,
    lightPos: vec3<f32>,
  }
  
  // 这里将 MVP 矩阵中的 Model 分离出来了，因为它是可以复用的
  // 在 shadow shader 和 render shader 中它表示同一个矩阵
  struct Model {
    modelMatrix: mat4x4<f32>,
  }
  
  // 注意这里使用两个 bind group 分开算
  @group(0) @binding(0) var<uniform> scene : Scene;
  @group(1) @binding(0) var<uniform> model : Model;
  
  @vertex
  fn main(
    @location(0) position: vec3<f32>
  ) -> @builtin(position) vec4<f32> {
    return scene.lightViewProjMatrix * model.modelMatrix * vec4(position, 1.0);
  }

`

export { shadow_vert }
