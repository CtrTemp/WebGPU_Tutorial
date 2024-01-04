import { vertex_shader, fragment_shader } from '../../../assets/Shaders/Prj02/shader';
import { simulation_compute } from '../../../assets/Shaders/Prj02/compute';
import { update_mip_compute } from '../../../assets/Shaders/Prj02/update_mip';


function Pipeline_creation(state, device) {


    /* ########################### Render Pipeline ########################### */


    const particle_Render_Pipeline_Layout = device.createPipelineLayout({
        bindGroupLayouts: [
            state.main_canvas.Layouts["mvp"],           // group0
            state.main_canvas.Layouts["sample"],        // group1
            state.main_canvas.Layouts["mip_vertex"]     // group2
        ]
    });
    state.main_canvas.Pipeline_Layouts["render_instances"] = particle_Render_Pipeline_Layout;


    const render_instances_pipeline = device.createRenderPipeline({
        layout: particle_Render_Pipeline_Layout,
        vertex: {
            module: device.createShaderModule({
                code: vertex_shader
            }),
            entryPoint: "vs_main",
            buffers: [
                state.main_canvas.VBO_Layouts["instances"],
                state.main_canvas.VBO_Layouts["quad"]
            ]
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment_shader
            }),
            entryPoint: "fs_main",
            targets: [
                {
                    format: state.main_canvas["canvasFormat"],
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
    state.main_canvas.Pipelines["render_instances"] = render_instances_pipeline;


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
            view: state.main_canvas.Textures["depth"].createView(),
            depthClearValue: 1.0,
            depthLoadOp: "clear",
            depthStoreOp: "store"
        }
    };
    state.main_canvas.passDescriptors["render_instances"] = renderPassDescriptor;


    /* ########################### Compute Pipeline ########################### */

    /**
     *  update instance pos
     * */ 
    const particle_Compute_Pipeline_Layout = device.createPipelineLayout({
        bindGroupLayouts: [state.main_canvas.Layouts["compute"]]
    });
    state.main_canvas.Pipeline_Layouts["simu_particles"] = particle_Render_Pipeline_Layout;

    const computePipeline = device.createComputePipeline({
        layout: particle_Compute_Pipeline_Layout,
        compute: {
            module: device.createShaderModule({
                code: simulation_compute,
            }),
            entryPoint: 'simulate',
        },
    });
    state.main_canvas.Pipelines["simu_particles"] = computePipeline;



    /**
     *  compute instance mip level
     * */ 
    const MipLevel_Compute_Pipeline_Layout = device.createPipelineLayout({
        bindGroupLayouts: [
            state.main_canvas.Layouts["mip_instance_arr"],  // group0
            state.main_canvas.Layouts["view_projection"],   // group1
        ]
    });
    state.main_canvas.Pipeline_Layouts["compute_miplevel"] = MipLevel_Compute_Pipeline_Layout;

    const MipLevelUpdatePipeline = device.createComputePipeline({
        layout: MipLevel_Compute_Pipeline_Layout,
        compute: {
            module: device.createShaderModule({
                code: update_mip_compute,
            }),
            entryPoint: 'simulate',
        },
    });
    state.main_canvas.Pipelines["update_miplevel"] = MipLevelUpdatePipeline;
}




export { Pipeline_creation }
