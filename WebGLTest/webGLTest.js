/*=================Creating a canvas=========================*/
let canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl');

const overlay = document.getElementById("overlay");
/*===========Defining and storing the geometry==============*/

let vertices = [400,400, 240,240, 200,200];
let sizes = [10, 50 ,15];
let colors = [ 1,1,0, 1,0,1, 0,1,1 ];

//Create and store data into vertex buffer
let vertex_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

//Create and store data into vertex buffer
let size_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, size_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);

//Create and store data into color buffers
let color_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

/*==========================Shaders=========================*/
const vertCode = `
    uniform vec2 u_resolution;

    attribute vec2 position;
    attribute float size;
    attribute vec3 color;

    varying vec2 v_Position;
    varying float v_Size;
    varying vec3 v_Color;
    
    void main(void) {
        gl_Position = vec4((position * vec2(1.0, -1.0) * 2.0 / u_resolution) + vec2(-1, 1), 1.0, 1.0);
        gl_PointSize = size;

        v_Position = (position * vec2(1, -1)) + vec2(0, u_resolution.y);
        v_Size = size;
        v_Color = color;
    }`;

const fragCode =  `
    precision mediump float;
    varying vec2 v_Position;
    varying float v_Size;
    varying vec3 v_Color;

    void main(void) {
        vec2 dist = gl_FragCoord.xy - v_Position;
        if ((dist.x*dist.x + dist.y*dist.y) > v_Size*v_Size/4.0){
            discard;
        }
        gl_FragColor = vec4(v_Color, 1);
    }`;

let vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);

let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);

var shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);

/*===========associating attributes to vertex shader ============*/
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
const position = gl.getAttribLocation(shaderProgram, "position");
gl.vertexAttribPointer(position, 2, gl.FLOAT, false,0,0) ; //position
gl.enableVertexAttribArray(position);

gl.bindBuffer(gl.ARRAY_BUFFER, size_buffer);
const size = gl.getAttribLocation(shaderProgram, "size");
gl.vertexAttribPointer(size, 1, gl.FLOAT, false,0,0) ; //position
gl.enableVertexAttribArray(size);

gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
const color = gl.getAttribLocation(shaderProgram, "color");
gl.vertexAttribPointer(color, 3, gl.FLOAT, false,0,0) ; //color
gl.enableVertexAttribArray(color);

gl.useProgram(shaderProgram);

const resolution = gl.getUniformLocation(shaderProgram, "u_resolution");
gl.uniform2fv(resolution, [canvas.width, canvas.height]);

/*===============Change Colors================*/
function addParticle(){
    vertices.push(Math.random()*canvas.width);
    vertices.push(Math.random()*canvas.height);

    colors.push(Math.random());
    colors.push(Math.random());
    colors.push(Math.random());

    sizes.push(Math.random()*50);
}

function diagnostics(dt){
    const fps =  (1/dt * 1000).toFixed(1);
    const ft = (dt).toFixed(2);
    const numP = vertices.length/2;
    overlay.textContent = `F.P.S.: ${fps}\nF.T.: ${ft}ms\nParticles: ${numP}`;
}

/*=================Drawing===========================*/

var time_old = 0;
var animate = function(time) {
    var dt = time-time_old;
    time_old = time;

    diagnostics(dt);

    for (let i = 0; i < 10; i++){
        addParticle();
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1.0);
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, size_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    gl.drawArrays(gl.POINTS, 0, vertices.length/2);

    window.requestAnimationFrame(animate);
}
animate(0);