
import { mat4, vec3, vec4 } from "wgpu-matrix"



// function gen_plane_instance(col, row, range) {
//     // 先假设就是从 0.0 ~ 1.0 的 range
//     const row_step = range / col;
//     const col_step = range / row;

//     let ret_arr = [];

//     const default_color = [0.8, 0.6, 0.0, 1.0];
//     for (let i = -row; i < row; i++) {
//         for (let j = -col; j < col; j++) {
//             let time = Math.random(); // 用于模拟随机粒子运动初始化值
//             // time = 0.25; // 给以指定值统一大小
//             let pos_x = (j + 0.5) * row_step;
//             let pos_y = (i + 0.5) * col_step;
//             let pos_z = Math.sin(2 * Math.PI * time); // rand value
//             const pos = [pos_x, pos_y, pos_z, 1.0];
//             const idx = Math.floor(Math.random() * 10);
//             ret_arr = ret_arr.concat(pos);                      // position
//             ret_arr = ret_arr.concat(default_color);            // color
//             ret_arr = ret_arr.concat([time, idx, 0.0, 0.0]);    // liftime + idx + padding

//             // flow_info["idx"] =  // in use
//         }
//     }

//     let flow_info = {};

//     flow_info["flow_arr"] = ret_arr;
//     flow_info["numParticles"] = ret_arr.length / 12;
//     flow_info["lifetime"] = 10.0; // not used

//     return flow_info;
// }

/**
 *  目前 focus 出现了问题，但具体是哪一个地方出了问题呢？？？还不明确
 * 回来排查bug
 * */ 

function gen_sphere_instance(radius, counts, state) {

    let ret_arr = [];
    // const default_color = [0.8, 0.6, 0.0, 1.0];
    const default_color = [0.1, 0.8, 0.95, 1.0];
    for (let i = 0; i < counts; i++) {
        const r1 = radius;
        let pos_x = (Math.random() * 2 - 1) * r1;
        const r2 = Math.sqrt(radius * radius - pos_x * pos_x);
        let pos_y = (Math.random() * 2 - 1) * r2;
        const r3 = Math.sqrt(radius * radius - pos_x * pos_x - pos_y * pos_y);
        let pos_z = (Math.random() * 2 - 1) * r3;
        let time = Math.asin(pos_z / Math.sqrt(pos_x * pos_x + pos_z * pos_z)); // rotating
        // console.log("time = ", time);
        // 这里是均衡 arcsin 只能取值 [-PI/2, PI/2] 的问题
        if (Math.random() > 0.5) {
            time += Math.PI;
        }
        // const idx = Math.random() * 9;

        ret_arr = ret_arr.concat([pos_x, pos_y, pos_z, 0.0]);   // pos
        ret_arr = ret_arr.concat(default_color);                // color
        ret_arr = ret_arr.concat([time, 1.0]);                  // liftime + idx


        let uv_offset = state.main_canvas.atlas_info["uv_offset"][i % 5];
        let tex_aspect = state.main_canvas.atlas_info["tex_aspect"][i % 5];
        let uv_size = state.main_canvas.atlas_info["uv_size"][i % 5];

        ret_arr = ret_arr.concat(uv_offset);                    // uv-offset
        ret_arr = ret_arr.concat(tex_aspect);                     // uv-scale
        ret_arr = ret_arr.concat(uv_size);                  // quad-scale
    }


    let flow_info = {};

    flow_info["flow_arr"] = ret_arr;
    flow_info["numParticles"] = counts;
    flow_info["lifetime"] = 10.0; // not used

    // console.log("counts = ", counts);
    // console.log("counts = ", ret_arr.length / 12);

    return flow_info;
}



// 保证 life time 的赋值正确即可，不需要大量的插值运算
function read_data_and_gen_line(lines_data, lifetime, color, insert_unit_cnt, segs) {

    let flow_info = {};

    let flow_arr = [];

    flow_info["flow_arr"] = flow_arr;
    let cnt = 0
    for (let key in lines_data) {
        cnt++;
        const item = lines_data[key];
        const len = item.position.length;
        const insert_stride = insert_unit_cnt + 1;
        const stride = lifetime / (len - 1) / insert_stride;

        // 设置一个随机的初始化 offset 看起来效果应该会好很多（但这样其实在语义上是错误的）
        // 这实际上表示你的粒子并非由同一时刻出发
        const seg_life = lifetime / segs;
        const rand_offset = Math.random() * seg_life;

        // 遍历一条流线中的每个粒子坐标
        // 并进行插值操作（暂不进行下采样）
        const scale = 50;
        for (let i = 0; i < len - 1; i++) {
            for (let j = 0; j < 3; j++) {
                item.position[i][j] /= scale; // 在相机结构体设置完成前，使用这个进行坐标缩放
            }


            const dir = [
                (item.position[i + 1][0] / scale - item.position[i][0]) / insert_stride,
                (item.position[i + 1][1] / scale - item.position[i][1]) / insert_stride,
                (item.position[i + 1][2] / scale - item.position[i][2]) / insert_stride
            ];
            for (let j = 0; j < insert_stride; j++) {
                let pos_temp = [
                    item.position[i][0] + dir[0] * j,
                    item.position[i][1] + dir[1] * j,
                    item.position[i][2] + dir[2] * j,
                    0.0  // padding
                ];


                flow_arr.push(...pos_temp);
                flow_arr.push(...color);

                const idx = i * insert_stride + j;
                flow_arr.push((idx * stride + rand_offset) % seg_life);
                flow_arr.push(...[0, 0, 0]); // padding
            }

        }
        if (cnt > 1000) {
            break;
        }
    }
    // console.log("max len = ", max_arr_len);
    // console.log("count = ", count);
    // console.log("lines_data = ", lines_data);

    console.log("cnt = ", cnt);

    flow_info["numParticles"] = flow_arr.length / 12;
    flow_info["lifetime"] = lifetime / segs;


    console.log("flow_info = ", flow_info);
    return flow_info;
}


export {
    read_data_and_gen_line,
    gen_sphere_instance
};

