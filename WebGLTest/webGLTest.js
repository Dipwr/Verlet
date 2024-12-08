/*=================Creating a canvas=========================*/
var canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl');

const overlay = document.getElementById("overlay");
/*===========Defining and storing the geometry==============*/

var vertices = [-1,-1, 1,-1, 1, 1];
var colors = [ 1,1,0, 1,0,1, 0,1,1 ];

//Create and store data into vertex buffer
var vertex_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

//Create and store data into color buffer
var color_buffer = gl.createBuffer ();
gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

/*==========================Shaders=========================*/

var vertCode = `
    attribute vec4 position;
    attribute vec4 color;
    varying vec4 vColor;

    void main(void) {
        gl_Position = position;
        vColor = color;
        gl_PointSize = 10.0;
    }`;

var fragCode =  `
    precision mediump float;
    varying vec4 vColor;
    void main(void) {
        gl_FragColor = vColor;
    }`;

var vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);

var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);

var shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);

/*===========associating attributes to vertex shader ============*/
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
var position = gl.getAttribLocation(shaderProgram, "position");
gl.vertexAttribPointer(position, 2, gl.FLOAT, false,0,0) ; //position
gl.enableVertexAttribArray(position);

gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
var color = gl.getAttribLocation(shaderProgram, "color");
gl.vertexAttribPointer(color, 3, gl.FLOAT, false,0,0) ; //color
gl.enableVertexAttribArray(color);
gl.useProgram(shaderProgram);

/*===============Change Colors================*/
function addParticle(){
    vertices.push(Math.random()*2 -1);
    vertices.push(Math.random()*2 -1);

    colors.push(Math.random());
    colors.push(Math.random());
    colors.push(Math.random());
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
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.clearDepth(1.0);
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.drawArrays(gl.POINTS, 0, vertices.length/2);

    window.requestAnimationFrame(animate);
}
animate(0);