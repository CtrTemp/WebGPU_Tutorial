import { mat4, vec3, vec4 } from "wgpu-matrix"
import { fill_MVP_UBO } from "./03_manage_UBO";


// GUI
import * as dat from "dat.gui"



function init_Camera(state) {


    // 创建 GUI
    const gui = new dat.GUI();
    state.GUI["prim"] = gui;

    let camera = state.main_canvas.prim_camera;


    const fov = Math.PI / 2;//90°
    const aspect = state.main_canvas.canvas.width / state.main_canvas.canvas.height;
    // const aspect = 1920 / 1080;
    const z_far = 1000.0;
    const z_near = 1.0;
    camera["z_near"] = z_near;
    camera["z_far"] = z_far;
    let projection = mat4.perspective(fov, aspect, z_near, z_far);



    // const lookFrom = vec3.fromValues(-50.0, 0.0, 0.0);
    const lookFrom = vec3.fromValues(-0.0, 0.0, 0.0);
    const viewDir = vec3.fromValues(1.0, 0.0, 0.0);
    const lookAt = vec3.add(lookFrom, viewDir);
    const up = vec3.fromValues(0.0, 1.0, 0.0);
    let view = mat4.lookAt(lookFrom, lookAt, up);

    const viewProjectionMatrix = mat4.multiply(projection, view);

    // 相机基本参数
    camera["fov"] = fov;            // 视场角
    camera["aspect"] = aspect;      // 屏幕宽高比
    camera["z_near"] = z_near;      // 视锥近平面
    camera["z_far"] = z_far;        // 视锥远平面

    camera["lookFrom"] = lookFrom;  // 相机/观察者位点
    camera["viewDir"] = viewDir;    // 单位向量
    camera["up"] = up;              // 相机相对向上向量
    // 为了监测相机坐标，单独设置一个结构体
    camera["pos"] = {
        x: lookFrom.at(0),
        y: lookFrom.at(1),
        z: lookFrom.at(2),
    }
    camera["dir"] = {
        dir_x: viewDir.at(0),
        dir_y: viewDir.at(1),
        dir_z: viewDir.at(1),
    }

    // 相机矩阵（需要根据相机基本参数计算得到）
    camera["matrix"] = viewProjectionMatrix;
    camera["view"] = view;
    camera["projection"] = projection;

    // 其他附加参数
    state.main_canvas.mouse_info["dragging"] = false;     // 当前鼠标是否正在拖动的标志
    state.main_canvas.mouse_info["firstMouse"] = false;   // 是否首次点击鼠标
    state.main_canvas.mouse_info["lastX"] = 0;
    state.main_canvas.mouse_info["lastY"] = 0;

    // 解算得到的相机方位角
    // camera["yaw"] = Math.PI / 2;
    camera["yaw"] = 0.0;
    camera["pitch"] = 0.0;

    // defineReactive(state.main_canvas.prim_camera, "yaw", Math.PI / 2);
    // defineReactive(state.main_canvas.prim_camera, "pitch", 0.0);
    // 如果没有滚转角更新，则可以不考虑相机up方向的更新，也不会影响解算right方向
    // camera["roll"] = 0.0; // 不需要 roll

    // 相机移动敏感度
    state.main_canvas.mouse_info["drag_speed"] = 0.005;
    state.main_canvas.mouse_info["wheel_speed"] = 0.005;
    state.main_canvas.keyboard_info["speed"] = 0.25;

    /**
     *  GUI para 
     * */
    const range = 50;
    gui.add(state.main_canvas.prim_camera, 'pitch', -2 * Math.PI, 2 * Math.PI, 0.01);
    gui.add(state.main_canvas.prim_camera, 'yaw', -2 * Math.PI, 2 * Math.PI, 0.01);
    gui.add(state.main_canvas.prim_camera.pos, "x", -range, range, 0.01);
    gui.add(state.main_canvas.prim_camera.pos, "y", -range, range, 0.01);
    gui.add(state.main_canvas.prim_camera.pos, "z", -range, range, 0.01);
    gui.add(state.main_canvas.prim_camera.dir, "dir_x", -1.0, 1.0, 0.01);
    gui.add(state.main_canvas.prim_camera.dir, "dir_y", -1.0, 1.0, 0.01);
    gui.add(state.main_canvas.prim_camera.dir, "dir_z", -1.0, 1.0, 0.01);

}


/**
 *  更新相机参数
 *  根据相机的基本参数，更新相机矩阵
 * */
function updateMainCamera(state, device) {
    let camera = state.main_canvas.prim_camera;
    let gui = state.GUI["prim"];

    camera.pos.x = camera.lookFrom.at(0);
    camera.pos.y = camera.lookFrom.at(1);
    camera.pos.z = camera.lookFrom.at(2);

    camera.dir.dir_x = camera.viewDir.at(0);
    camera.dir.dir_y = camera.viewDir.at(1);
    camera.dir.dir_z = camera.viewDir.at(2);


    let projection = mat4.perspective(
        camera["fov"],
        camera["aspect"],
        camera["z_near"],
        camera["z_far"]
    );
    let view = mat4.lookAt(
        camera["lookFrom"],
        vec3.add(camera["lookFrom"], camera["viewDir"]),
        camera["up"]
    );


    const viewProjectionMatrix = mat4.multiply(projection, view);


    camera["matrix"] = viewProjectionMatrix;
    camera["view"] = view;
    camera["projection"] = projection;


    // GPU 端更新相机参数
    fill_MVP_UBO(state, device);

    // !!! 注意这里必须手动触发才行更新GUI
    gui.updateDisplay();
}


function moveCamera(state, device) {
    let camera = state.main_canvas.prim_camera;
    camera["lookFrom"][2] = Math.sin(Date.now() / 1000) * 2 - 5;
    updateMainCamera(state.main_canvas, device, gui);
}

/**
 *  将相机移动到默认原位观察点
 *  回来之后将这个改好就行~ 初始化相机移动轨迹自适应速度平滑~
 * */
function defocusCamera(state, device, gui) {
    let step = 50;
    let time_stride = 25; // 25ms 一次坐标更新（尽量保证与帧率一致或小于帧率）

    let camera = state.main_canvas.prim_camera;

    const current_camera_pos = camera.lookFrom;  // vec3
    const targets_camera_pos = vec3.fromValues(27.45, 28.94, -31.91);

    let dir_vec = vec3.sub(targets_camera_pos, current_camera_pos);


    const current_camera_pitch = camera.pitch;
    const targets_camera_pitch = -0.68;
    const pitch_diff = targets_camera_pitch - current_camera_pitch;


    const current_camera_yaw = camera.yaw;
    const targets_camera_yaw = 2.37;
    const yaw_diff = targets_camera_yaw - current_camera_yaw;

    let step_count = 0;
    let timer = setInterval(() => {

        const speed = Math.cos(Math.PI * step_count / step) - Math.cos(Math.PI * (step_count + 1) / step);

        const dir_vec_unit = vec3.mulScalar(dir_vec, speed / 2);
        const pitch_unit = pitch_diff * speed / 2;
        const yaw_unit = yaw_diff * speed / 2;
        // 更新 lookFrom
        camera["lookFrom"] = vec3.add(camera["lookFrom"], dir_vec_unit);

        // 更新方位角
        camera["pitch"] += pitch_unit;
        camera["yaw"] += yaw_unit;

        // 进一步更新 viewDir
        let new_view_dir = vec3.fromValues(
            Math.cos(state.main_canvas.prim_camera["yaw"]) * Math.cos(state.main_canvas.prim_camera["pitch"]),
            Math.sin(state.main_canvas.prim_camera["pitch"]),
            Math.sin(state.main_canvas.prim_camera["yaw"]) * Math.cos(state.main_canvas.prim_camera["pitch"])
        );

        state.main_canvas.prim_camera["viewDir"] = new_view_dir;

        updateMainCamera(state, device, gui);

        step_count++;
    }, time_stride);

    setTimeout(() => {
        clearInterval(timer);
    }, step * time_stride);





    setTimeout(() => {
        clearInterval(timer);
    }, step * time_stride);


    /**
     *  最后开始 animation 
     * */

    state.main_canvas.simu_info["simu_pause"] = 0.0;

    device.queue.writeBuffer(
        state.main_canvas.UBOs["compute"],
        0,
        new Float32Array([
            state.main_canvas.simu_info["simu_speed"],
            0.0,
            0.0,
            0.0,// padding
            Math.random() * 100,
            Math.random() * 100, // seed.xy
            1 + Math.random(),
            1 + Math.random(), // seed.zw
            0.0, // state.main_canvas.particle_info["lifetime"],
            state.main_canvas.simu_info["simu_pause"], // pause = false
            0.0, // paddings 
            0.0
        ])
    );

}


function focusCamera(state, device, gui) {
    let step = 20;
    let time_stride = 25; // 25ms 一次坐标更新（尽量保证与帧率一致或小于帧率）

    let camera = state.main_canvas.prim_camera;

    const current_camera_pos = camera.lookFrom;  // vec3
    const targets_camera_pos = vec3.fromValues(9.15, 8.22, -8.91);

    let dir_vec = vec3.sub(targets_camera_pos, current_camera_pos);
    let dir_vec_unit = vec3.divScalar(dir_vec, step);


    const current_camera_pitch = camera.pitch;
    const targets_camera_pitch = -0.57;
    let pitch_unit = (targets_camera_pitch - current_camera_pitch) / step;


    const current_camera_yaw = camera.yaw;
    const targets_camera_yaw = 2.28;
    let yaw_unit = (targets_camera_yaw - current_camera_yaw) / step;


    let timer = setInterval(() => {

        const speed = Math.cos(Math.PI * step_count / step) - Math.cos(Math.PI * (step_count + 1) / step);

        dir_vec_unit = vec3.mulScalar(dir_vec, speed / 2);
        // 更新 lookFrom
        camera["lookFrom"] = vec3.add(camera["lookFrom"], dir_vec_unit);

        // 更新 viewDir
        let new_view_dir = (vec3.add(state.main_canvas.prim_camera["viewDir"], view_dir_unit));

        // 进而更新方位角
        const x = new_view_dir[0];
        const y = new_view_dir[1];
        camera["pitch"] = Math.asin(y);
        camera["yaw"] = Math.acos(x / (Math.sqrt(1 - y * y)));

        state.main_canvas.prim_camera["viewDir"] = new_view_dir;

        updateMainCamera(state.main_canvas, device, gui);

    }, time_stride);

    setTimeout(() => {
        clearInterval(timer);
    }, step * time_stride);
}


/**
 *  任选一张图片进行 focus 查看，定制查看路径
 *  目前假设为球投影
 *  回来修改速度函数~
 * */
function focusOnRandomPic(state, device, gui, flow_info) {
    /**
     *  首先暂停 animation 
     * */

    state.main_canvas.simu_info["simu_pause"] = 1.0;

    device.queue.writeBuffer(
        state.main_canvas.UBOs["compute"],
        0,
        new Float32Array([
            state.main_canvas.simu_info["simu_speed"],
            0.0,
            0.0,
            0.0,// padding
            Math.random() * 100,
            Math.random() * 100, // seed.xy
            1 + Math.random(),
            1 + Math.random(), // seed.zw
            state.main_canvas.particle_info["lifetime"],
            state.main_canvas.simu_info["simu_pause"], // pause = false
            0.0, // paddings 
            0.0
        ])
    );

    let step = 50;
    let time_stride = 25; // 25ms 一次坐标更新（尽量保证与帧率一致或小于帧率）

    let camera = state.main_canvas.prim_camera;


    /**
     *  再根据仿真时间，找到粒子的位置
     * */
    // 这里提出一个优化，将数据包的 arr stride 大小打包成一个单独的全局变量为好
    // 不然总是需要重复修改，每次都需要修改大量的位置，很容易忘记
    const particle_counts = flow_info["numParticles"];
    const rand_idx = Math.floor(Math.random() * particle_counts) * state.main_canvas.particle_info["particleInstanceByteSize"] / 4;

    let p_x = flow_info.flow_arr[rand_idx + 0];
    let p_y = flow_info.flow_arr[rand_idx + 1];
    let p_z = flow_info.flow_arr[rand_idx + 2];
    let life_time = flow_info.flow_arr[rand_idx + 8];

    const radius = Math.sqrt(p_x * p_x + p_z * p_z);
    p_z = radius * Math.sin(life_time + state.main_canvas.simu_info["simu_time"]);
    p_x = radius * Math.cos(life_time + state.main_canvas.simu_info["simu_time"]);



    // view dir 直接更新，不用再计算方位角
    const cur_view_dir = state.main_canvas.prim_camera["viewDir"];
    const new_view_dir = vec3.normalize(vec3.fromValues(-p_x, -p_y, -p_z));
    const view_dir_unit = vec3.divScalar(vec3.sub(new_view_dir, cur_view_dir), step);




    // 相机摆放位置离图片的距离（正对距离）
    const distance = 1.15;
    const current_camera_pos = camera.lookFrom;  // vec3
    const reverse_view_dir = vec3.normalize(vec3.fromValues(p_x, p_y, p_z));
    const targets_camera_pos = vec3.add(vec3.fromValues(p_x, p_y, p_z), vec3.mulScalar(reverse_view_dir, distance));

    let dir_vec = vec3.sub(targets_camera_pos, current_camera_pos);
    let dir_vec_unit = vec3.divScalar(dir_vec, step);


    let step_count = 0;
    let timer = setInterval(() => {

        const speed = Math.cos(Math.PI * step_count / step) - Math.cos(Math.PI * (step_count + 1) / step);

        dir_vec_unit = vec3.mulScalar(dir_vec, speed / 2);
        // 更新 lookFrom
        camera["lookFrom"] = vec3.add(camera["lookFrom"], dir_vec_unit);

        // 更新 viewDir
        let new_view_dir = (vec3.add(state.main_canvas.prim_camera["viewDir"], view_dir_unit));

        // 进而更新方位角
        const x = new_view_dir[0];
        const y = new_view_dir[1];
        camera["pitch"] = Math.asin(y);
        camera["yaw"] = Math.acos(x / (Math.sqrt(1 - y * y)));

        state.main_canvas.prim_camera["viewDir"] = new_view_dir;

        updateMainCamera(state, device, gui);
        step_count++;

    }, time_stride);



    setTimeout(() => {
        clearInterval(timer);
    }, step * time_stride);
}


export {
    init_Camera,
    updateMainCamera,
    moveCamera,
    defocusCamera,
    focusCamera,
    focusOnRandomPic,
}
