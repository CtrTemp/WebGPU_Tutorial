function set_Layout(state, device) {

    const MVP_UBO_Layout = device.createBindGroupLayout({
        entries: [{
            binding: 0,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        }, {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        }, {
            binding: 2,
            visibility: GPUShaderStage.VERTEX,
            buffer: {
                type: "uniform"
            }
        }]
    });
    state.Layouts["mvp"] = MVP_UBO_Layout;

    const Sample_UBO_Layout = device.createBindGroupLayout({
        entries: [
            // sampler
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: {
                    type: "filtering"
                }
            },
            // big texture test Mip0
            {
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                texture: {
                    sampleType: 'float'
                }
            }

        ]
    });
    state.Layouts["sample"] = Sample_UBO_Layout;

    const compute_UBO_Layout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "uniform"
                }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {
                    type: "storage"
                }
            }
        ]
    });
    state.Layouts["compute"] = compute_UBO_Layout;

}




export { set_Layout }
