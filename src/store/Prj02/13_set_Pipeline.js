import { vertex_shader, fragment_shader } from '../../assets/Shaders/Prj02/shader';
import { simulation_compute } from '../../assets/Shaders/Prj02/compute';


function set_Pipeline(state, device) {


    /* ########################### Render Pipeline ########################### */


    const particle_Render_Pipeline_Layout = device.createPipelineLayout({
        bindGroupLayouts: [
            state.Layouts["mvp"],
            state.Layouts["sample"]
        ]
    });
    state.Pipeline_Layouts["render_particles"] = particle_Render_Pipeline_Layout;


    const render_particles_pipeline = device.createRenderPipeline({
        layout: particle_Render_Pipeline_Layout,
        vertex: {
            module: device.createShaderModule({
                code: vertex_shader
            }),
            entryPoint: "vs_main",
            buffers: [
                state.VBO_Layouts["particles"],
                state.VBO_Layouts["quad"]
            ]
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment_shader
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: state["canvasFormat"],
                    // // 這一步是設置 半透明度 必須的要素（取消设置，得到默认遮挡）
                    // // 如果使用半透明，则将以下 depthStencil 中 depthWriteEnabled 字段设为 false
                    // blend: {
                    //     color: {
                    //         srcFactor: 'src-alpha',
                    //         dstFactor: 'one',
                    //         operation: 'add',
                    //     },
                    //     alpha: {
                    //         srcFactor: 'zero',
                    //         dstFactor: 'one',
                    //         operation: 'add',
                    //     },
                    // },
                }
            ]
        },
        primitive: {
            topology: "triangle-list",
            cullMode: "back"
        },
        depthStencil: {
            // 如果使能以上的半透明，则将以下的 depthWriteEnabled 字段改为 false
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus',
        },
    });
    state.Pipelines["render_particles"] = render_particles_pipeline;


    const renderPassDescriptor = {
        colorAttachments: [
            {
                view: undefined,
                clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                loadOp: "clear",
                storeOp: "store"
            }
        ],
        depthStencilAttachment: {
            view: state.Textures["depth"].createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    };
    state.passDescriptors["render_particles"] = renderPassDescriptor;


    /* ########################### Compute Pipeline ########################### */


    const particle_Compute_Pipeline_Layout = device.createPipelineLayout({
        bindGroupLayouts: [state.Layouts["compute"]]
    });
    state.Pipeline_Layouts["simu_particles"] = particle_Render_Pipeline_Layout;

    const computePipeline = device.createComputePipeline({
        layout: particle_Compute_Pipeline_Layout,
        compute: {
            module: device.createShaderModule({
                code: simulation_compute,
            }),
            entryPoint: 'simulate',
        },
    });
    state.Pipelines["simu_particles"] = computePipeline;

    const simu_particles_BindGroup = device.createBindGroup({
        layout: state.Layouts["compute"],
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: state.UBOs["compute"]
                }
            },
            {
                binding: 1,
                resource: {
                    buffer: state.VBOs["particles"],
                    offset: 0,
                    size: state.particle_info["numParticles"] * state.particle_info["particleInstanceByteSize"]
                }
            }
        ]
    });

    state.BindGroups["compute"] = simu_particles_BindGroup;
}




export { set_Pipeline }