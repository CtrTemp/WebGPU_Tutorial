
import { render_main_view_quad } from "./quad_pack_view/21_GPU_Pass";

/**
 *  Stage04：启动渲染循环
 * */
function renderLoop_quad(state, device) {

    /**
     *  Pre-Process
     * */ 


    /**
     *  Loop
     * */
    let timerID = setInterval(() => {

        const renderPassDescriptor = state.main_view_flow_quad.passDescriptors["render_instances"];

        // 自适应 canvas 大小
        const window_width = window.innerWidth;
        const window_height = window.innerHeight;
        state.main_canvas.canvas.width = window_width;
        state.main_canvas.canvas.height = window_height;


        /**
         *  color attachement reconstruct
         * */ 
        renderPassDescriptor.colorAttachments[0].view = state.main_canvas.GPU_context
            .getCurrentTexture()
            .createView();

        /**
         *  depth attachement reconstruct
         * */ 
        state.GPU_memory.Textures["depth"].destroy();
        state.GPU_memory.Textures["depth"] = device.createTexture({
            size: [window_width, window_height],
            format: 'depth24plus',
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
        })
        renderPassDescriptor.depthStencilAttachment.view = state.GPU_memory.Textures["depth"].createView();

        /**
         *  camera aspect update
         * */ 
        state.camera.prim_camera["aspect"] = window_width / window_height;

        /**
         *  submit a pass to CMD queue as a render call
         * */ 
        render_main_view_quad(state, device, renderPassDescriptor);

    }, 25);
}


export { renderLoop_quad }
