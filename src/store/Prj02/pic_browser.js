
/**
 *  Utils
 * */

import { dataURL2Blob } from "./bitMap";

/**
 *  Main-View Related
 * */
import { init_device_main } from "./main_view/00_init_device";
import { init_Camera } from "./main_view/xx_set_camera.js"
import { parse_dataset_info } from "./main_view/parse_dataset_info";
import {
    mipTexture_creation,
    fill_Mip_Texture,
} from "./main_view/01_manage_Texture";
import {
    VBO_creation,
    fill_Instance_Pos_VBO,
    fill_Atlas_Info_VBO,
    fill_Quad_VBO,
    manage_VBO_Layout
} from "./main_view/02_manage_VBO"
import { UBO_creation, fill_MVP_UBO } from "./main_view/03_manage_UBO"
import { SBO_creation } from "./main_view/04_manage_SBO";
import { Layout_creation } from "./main_view/11_set_Layout";
import { BindGroup_creation } from "./main_view/12_set_BindGroup";
import { Pipeline_creation } from "./main_view/13_set_Pipeline";

import {
    compute_miplevel_pass,
    read_back_miplevel_pass,
} from "./main_view/21_GPU_Pass";

import {
    canvasMouseInteraction,
    canvasKeyboardInteraction
} from "./main_view/xx_interaction";

import {
    renderLoop_main
} from "./renderLoop_main_view";

/**
 *  Sub-View Related
 * */
import { init_device_sub } from "./sub_view/00_init_device";
import { subViewTexture_creation } from "./sub_view/01_manage_Texture";
import {
    VBO_creation_sub,
    IBO_creation_sub,
    Update_and_Fill_Cone_VBO,
    Fill_cone_IBO,
    manage_VBO_Layout_sub,
} from "./sub_view/02_manage_VBO"
import { UBO_creation_sub, fill_MVP_UBO_sub } from "./sub_view/03_manage_UBO"
import { Layout_creation_sub } from "./sub_view/11_set_Layout";
import { BindGroup_creation_sub } from "./sub_view/12_set_BindGroup";
import { Pipeline_creation_sub } from "./sub_view/13_set_Pipeline";
import { subCanvasMouseInteraction } from "./sub_view/xx_interaction";
import { init_Camera_sub } from "./sub_view/xx_set_camera.js"


import { renderLoop_sub } from "./renderLoop_sub_view";





export default {
    namespaced: true,
    /**
     *  本工程使用Vue框架，借助WebGPU重构工程，实现前向渲染管线 
     */
    actions: {

        async construct_imgBitMap(context, ret_json_pack) {
            // console.log("json pack received = ", ret_json_pack);

            // 开始创建 img bit map
            for (let i = 0; i < ret_json_pack.arr.length; i++) {

                let file = ret_json_pack.arr[i];
                let url = "data:image/png;base64," + file;

                const blob = dataURL2Blob(url);

                // console.log("blob = ", blob);

                const img_bitMap = await createImageBitmap(blob);

                context.state.CPU_storage.instancedBitMap.push(img_bitMap);
            }

            context.state.fence["BITMAP_READY"] = true;
            // console.log("bitmaps = ", context.state.CPU_storage.instancedBitMap);
        },

        async construct_mip_imgBitMap(context, ret_json_pack) {
            // console.log("json pack received = ", ret_json_pack);

            let flag = false;
            if (context.state.CPU_storage.mipBitMap.length == 13) {
                flag = true;
            }

            const bitMapArr = ret_json_pack["mipBitMaps"];

            // 开始创建 img bit map
            for (let i = 0; i < bitMapArr.length; i++) {

                let current_level_mapArr = [];

                for (let j = 0; j < bitMapArr[i].length; j++) {

                    let file = bitMapArr[i][j];
                    let url = "data:image/png;base64," + file;

                    const blob = dataURL2Blob(url);

                    const img_bitMap = await createImageBitmap(blob);

                    current_level_mapArr.push(img_bitMap);

                }
                if (flag) {
                    context.state.CPU_storage.mipBitMap[i] = current_level_mapArr;
                }
                else {
                    context.state.CPU_storage.mipBitMap.push(current_level_mapArr);
                }
            }

            // console.log("bitmaps = ", context.state.CPU_storage.mipBitMap);
            context.state.fence["BITMAP_READY"] = true;
        },

        /**
         *  从GPU获取返回结果
         * */
        async readBackMipLevel_and_FetchPicFromServer(context, device) {
            const state = context.state;
            /**
             *  Read Back MipLevel info from GPU
             * */
            await read_back_miplevel_pass(state, device);
            console.log("Mip data read back Done~");

            /**
             *  Fetch Instance Picture from Server
             * */
            const mip_info = state.CPU_storage.mip_info;

            const cmd_json = {
                cmd: "fetch_mip_instance",
                mip_info: mip_info, // mip info 描述信息
            };

            // console.log("cmd_json = ", cmd_json);
            state.ws.send(JSON.stringify(cmd_json));
        }

    },
    mutations: {

        /**
         *   Pre01：device 相关初始化，选中设备，为device、canvas相关的上下文全局变量赋值
         * */
        init_device(state, { canvas, device }) {
            init_device_main(state, { canvas: canvas.main_canvas, device });
            init_device_sub(state, { canvas: canvas.sub_canvas, device });
            state.fence["DEVICE_READY"] = true;
        },

        /**
         *  Pre02：camera 相关初始化
         * */
        init_camera(state, device) {
            init_Camera(state, device);
            init_Camera_sub(state, device);
            console.log("main camera = ", state.camera.prim_camera);
        },


        /**
         *  Stage01 向后台申请数据库（图片集）信息，接受到后台信息后，填充一些必要的全局变量
         * */
        main_canvas_initialize_stage1(state, ret_json_pack) {
            parse_dataset_info(state, ret_json_pack);
            state.fence["DATASET_INFO_READY"] = true;
            console.log("DATASET_INFO_READY");
        },

        /**
         *  Stage02：Device端的缓冲区开辟，仅创建/开辟内存，不进行填充 
         * */
        main_canvas_initialize_stage2(state, device) {
            /**
             *  Create Texture
             * */
            mipTexture_creation(state, device);
            subViewTexture_creation(state, device);

            /**
             *  Create VBO
             * */
            VBO_creation(state, device);
            VBO_creation_sub(state, device);

            /**
             *  Creat IBO
             * */
            IBO_creation_sub(state, device);


            /**
             *  Manage VBO Layout
             * */
            manage_VBO_Layout(state);
            manage_VBO_Layout_sub(state);

            /**
             *  Create UBO
             * */
            UBO_creation(state, device);
            UBO_creation_sub(state, device);

            /**
             *  Create SBO
             * */
            SBO_creation(state, device);

            console.log("Buffer/Texture creation on Device Done~");
        },

        /**
         *  Stage03：Device端的布局、绑定组、管线创建
         * */
        main_canvas_initialize_stage3(state, device) {

            /**
             *  Create Layout
             * */
            Layout_creation(state, device);
            Layout_creation_sub(state, device);

            /**
             *  Create BindGroup
             * */
            BindGroup_creation(state, device);
            BindGroup_creation_sub(state, device);

            /**
             *  Create Pipeline
             * */
            Pipeline_creation(state, device);
            Pipeline_creation_sub(state, device);


            console.log("Layout/BindGroup/Pipeline creation Done~");
        },

        /**
         *  Stage04：GPU计算MipLevel
         * */
        main_canvas_initialize_stage4(state, device) {
            /**
             *  Fill MVP Related UBOs
             * */
            fill_MVP_UBO(state, device);
            fill_MVP_UBO_sub(state, device);

            // 以下读取计算返回结果错误，明天来了讨论进行修改（2024/01/04） 
            // 问题在于忘记了对部分的 VBO 进行填充！

            /**
             *  Fill instances pos Related VBOs/SBOs 
             * */
            fill_Instance_Pos_VBO(state, device);


            /**
             *  Compute MipLevel on GPU
             * */
            compute_miplevel_pass(state, device);

            state.fence["COMPUTE_MIP_SUBMIT"] = true;
            console.log("COMPUTE MIP SUBMIT DONE~");
        },

        /**
         *  Stage05：填充渲染管线剩余所需一切
         * */
        main_canvas_initialize_stage5(state, device) {

            /**
             *  Fill Texture Memory on GPU
             * */
            fill_Mip_Texture(state, device);


            /**
             *  Fill Atlas Info of VBO
             * */
            fill_Atlas_Info_VBO(state, device);

            /**
             *  Fill quad VBOs
             * */
            fill_Quad_VBO(state, device);

            /**
             *  Fill cone VBOs
             * */
            Update_and_Fill_Cone_VBO(state, device);

            /**
             *  Fill cone IBOs
             * */
            Fill_cone_IBO(state, device);


            /**
             *  Register Interaction Events
             * */
            // Main-Canvas
            canvasMouseInteraction(state, device);
            canvasKeyboardInteraction(state, device);
            // Sub-Canvas
            subCanvasMouseInteraction(state, device);




            state.fence["RENDER_READY"] = true;

        },


        /**
         *  Main View Render Loop
         * */
        main_canvas_renderLoop(state, device) {
            renderLoop_main(state, device);
        },

        /**
         *  Sub View Render Loop
         * */
        sub_canvas_renderLoop(state, device) {
            renderLoop_sub(state, device);
        },


    },
    state() {
        return {
            ws: undefined,
            GUI: {},
            camera: {
                prim_camera: {},
                sub_camera: {},
            },
            /**
             *  全局时序控制器，设置一些flag，并通过监控它们来获取正确的程序执行
             * */
            fence: {
                // DEVICE_READY: { val: false },    // 暂时没用到
                DATASET_INFO_READY: { val: false }, // 初始化阶段向后台申请数据库信息
                COMPUTE_MIP_SUBMIT: { val: false }, // 已经向GPU提交计算MipLevel的申请，等待数据返回
                BITMAP_READY: { val: false },       // BitMap构建完成，可以填充Texture Memory
                RENDER_READY: { val: false },       // 
            },
            GPU_memory: {

                VBOs: {},
                IBOs: {},
                UBOs: {},
                SBOs: {},
                Textures: {
                    instance: [],
                    mip_instance: [],
                },
            },
            CPU_storage: {
                storage_arr: {}, // storage data in CPU for SBOs
                vertices_arr: {},
                indices_arr: {},  // 暂时不需要

                VBO_Layouts: {},
                Pipelines: {},
                passDescriptors: {},
                Pipeline_Layouts: {},
                Layouts: {},
                BindGroups: {},

                instancedBitMap: [],
                mipBitMap: [],

                atlas_info: {
                    size: [],       // 用于记录大纹理的长宽尺寸
                    uv_offset: [],  // 用于记录instance对应图片纹理在大纹理中的uv偏移
                    uv_size: [],    // 用于记录instance对应图片纹理在大纹理中的uv归一化宽高尺寸
                    tex_aspect: [], // 用于记录instance对应图片纹理的宽高比系数

                },
                mip_atlas_info: [],
                mip_info: {
                    total_length: 0,// 用于记录miplevel的最大深度（也就是应该创建多少个大纹理）
                    arr: []         // 用于记录当前视场中图片的MipLevel信息
                },

                instance_info: {}, // 描述instance数量等数据集信息，后端读取文件获得
                additional_info: {},
            },
            flow_temp: {

            },
            main_canvas: {

                canvas: null,
                canvasFormat: null,
                // 指向當前GPU上下文，所以只需要一個 
                GPU_context: null,


                simulationParams: {}, // 仿真运行参数

                prim_camera: {},
                mouse_info: {},
                keyboard_info: {},
                simu_info: {
                    simu_pause: 0.0,
                    simu_time: 0.0,
                    simu_speed: 0.0,
                },
            },
            sub_canvas: {
                // 我們假定目前只有一個 canvas
                canvas: null,
                canvasFormat: null,
                // 指向當前GPU上下文，所以只需要一個 
                GPU_context: null,
                mouse_info: {},
                keyboard_info: {},
            }
        }
    },
    getters: {}
}
