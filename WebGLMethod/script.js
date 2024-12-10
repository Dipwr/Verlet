let canvas = document.getElementById('gl-canvas');
const gl = canvas.getContext('webgl');

const overlay = document.getElementById("overlay");

const boundX = window.innerWidth;
const boundY = window.innerHeight;
canvas.width = boundX;
canvas.height = boundY;

let paused = false;
const simSpeed = 1;

let mouseDown = false;
let mousePos = [0,0];
let mouseSize = 100;

//solver
const solver = new Solver();

//clear buffer
let toBeCleared = [];

//timing setup
let prevTs;
let dtAcc = 0;
let Tdt = 0;

//- - - WebGL Setup - - -
//Create and store data into vertex buffer
let vertex_buffer = gl.createBuffer ();

//Create and store data into vertex buffer
let size_buffer = gl.createBuffer ();

//Create and store data into color buffers
let color_buffer = gl.createBuffer ();

// - Shaders -
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

// - Associate attributes and uniforms -
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

//iniciate the program starting with the setup function
setup();

function setup(){
    window.addEventListener('mousedown', function () {
		mouseDown = true;
	});
	window.addEventListener('mouseup', function () {
		mouseDown = false;
	});
	
	window.addEventListener('mousemove', function (e) {
		mousePos[0] = e.x
		mousePos[1] = e.y
	});

    solver.setup();

    prevTs = window.performance.now() / 1000
	requestAnimationFrame(frame);
}

function frame() {
	//calculate DeltaTime
	let now = (window.performance.now() / 1000);
	let deltaTime = (now - prevTs) * simSpeed;
	prevTs = now;

    //diagnostics
    

	if(!paused){
        timedEvents(deltaTime);
		update(deltaTime);
		draw(deltaTime);
	}
	//Recursive function (call itself)
	requestAnimationFrame(frame);
}

function timedEvents(deltaTime){
    dtAcc += deltaTime;
    Tdt += deltaTime;
    if (dtAcc >= 0.01){
        for (let i = 0; i < 3; i++){
            const obj = new VerletObject([100,100 + (12*i)], 5, 1, [Math.random(),Math.random(),Math.random()], solver);
            obj.accelerate([200000,0]);
            solver.objects.push(obj);
        }
        dtAcc = 0;
    }
}

function update(deltaTime){
    solver.update(deltaTime, 5);
}

function draw(deltaTime){

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1.0);
    gl.viewport(0.0, 0.0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    const vertices = solver.objects.map(v => v.pos).flat(1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, size_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(solver.objects.map(v => v.size*2)), gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(solver.objects.map(v => v.color).flat(1)), gl.STATIC_DRAW);

    gl.drawArrays(gl.POINTS, 0, vertices.length/2);

    diagnostics(deltaTime, vertices.length/2);
}

function diagnostics(dt, numP){
    const fps =  (1/dt).toFixed(1);
    const ft = (dt*1000).toFixed(2);
    overlay.textContent = `F.P.S.: ${fps}\nF.T.: ${ft}ms\nParticles: ${numP}`;
}

function Solver(){
    this.objects = [];

    this.cells = [];

    this.gravity = [0, 1000];

    this.maxSize = 0;

    this.update = function(deltaTime, subSteps, iterations){
        if (this.objects.length > 0){
            const subdt = deltaTime/subSteps;
            for(let i = 0; i < subSteps; i++){
                this.applyGravity();
                this.updatePositions(subdt);
                this.solveCollisions();
                this.applyConstraints();
                
            }
        }
    }

    this.updatePositions = function(deltaTime){
        //clear the cells
        this.cells = [];
	    for (let i = 0; i < Math.ceil((boundX + (2 * this.maxSize))/this.maxSize); i++){
            this.cells.push([]);
            for (let j = 0; j < Math.ceil((boundY + (2 * this.maxSize))/this.maxSize); j++){
                this.cells[i].push([]);
            }
        }

        for (let i = 0; i < this.objects.length; i++){
            this.objects[i].updatePosition(deltaTime);

            if (this.isOutOfBounds(this.objects[i].pos, this.objects[i].size)){
                this.objects.splice(i, 1);

                i--
                continue;
            }

            const cellx = Math.floor((this.objects[i].pos[0] + this.maxSize) / this.maxSize);
		    const celly = Math.floor((this.objects[i].pos[1] + this.maxSize) / this.maxSize);
		    this.cells[cellx][celly].push(i);
        }
    }

    this.isOutOfBounds = function(pos, r){
        if ((pos[0] < -r) || (pos[0] > boundX + r) || (pos[1] < -r) || (pos[1] > boundY + r)) {
            return true;
        } else {
            return false;
        }
    }

    this.applyGravity = function(){
        for (let i = 0; i < this.objects.length; i++){
            this.objects[i].accelerate(this.gravity); 
        }
    }

    this.applyConstraints = function(){
        this.mouseConstraint(mouseSize);
        //this.circleConstraint([400,400], 400);
        this.rectangleConstraint([400,400], [700,700]);
    }

    this.circleConstraint = function(center, r){
        for (let i = 0; i < this.objects.length; i++){
            const dx = this.objects[i].pos[0] - center[0];
            const dy = this.objects[i].pos[1] - center[1];

            const dist = Math.sqrt(dx*dx + dy*dy); 

            if (dist > r-this.objects[i].size){
                const ndx = dx / dist;
                const ndy = dy / dist;
                this.objects[i].pos[0] += ndx * -(dist + this.objects[i].size - r);
                this.objects[i].pos[1] += ndy * -(dist + this.objects[i].size - r);
            }
        }
    }

    this.rectangleConstraint = function(center, size){
        for (let i = 0; i < this.objects.length; i++){
            /*if (this.objects[i].pos[0] < (center[0] - size[0]/2) + this.objects[i].size) {
                this.objects[i].pos[0] = (center[0] - size[0]/2) + this.objects[i].size;
            } else*/ if(this.objects[i].pos[0] > (center[0] + size[0]/2) - this.objects[i].size){
                this.objects[i].pos[0] = (center[0] + size[0]/2) - this.objects[i].size;
            }
            if (this.objects[i].pos[1] < (center[1] - size[1]/2) + this.objects[i].size) {
                this.objects[i].pos[1] = (center[1] - size[1]/2) + this.objects[i].size;
            } else if(this.objects[i].pos[1] > (center[1] + size[1]/2) - this.objects[i].size){
                this.objects[i].pos[1] = (center[1] + size[1]/2) - this.objects[i].size;
            }
        }
    }

    this.mouseConstraint = function(r){
        if(mouseDown){
            for (let i = 0; i < this.objects.length; i++){
                const threshold = this.objects[i].size + r;
                const dx = this.objects[i].pos[0] - mousePos[0];
                const dy = this.objects[i].pos[1] - mousePos[1];

                const sqdist = dx*dx + dy*dy
                let dist;
                if (sqdist == 0){
                    dist = 1;
                } else {
                    dist = Math.sqrt(sqdist);
                }
                    
                if (dist < threshold){
                    const ndx = (dx / dist);
                    const ndy = (dy / dist);
                        
                    this.objects[i].pos[0] += ndx * (threshold-dist);
                    this.objects[i].pos[1] += ndy * (threshold-dist);
                }
            }
        }
    }

    this.solveCollisions = function(){
        if (this.objects.length > 1){
            for (let i = 0; i < this.objects.length; i++){
                let neighboors = this.getNeigbours(i);
                for (let j = 0; j < neighboors.length; j++){
                    const ni = neighboors[j];
                    if(i == ni){continue;}
                    const threshold = this.objects[i].size + this.objects[ni].size;

                    const dx = this.objects[i].pos[0] - this.objects[ni].pos[0];
                    const dy = this.objects[i].pos[1] - this.objects[ni].pos[1];

                    const sqdist = dx*dx + dy*dy

                    let dist;
                    if (sqdist == 0){
                        dist = 1;
                    } else {
                        dist = Math.sqrt(sqdist);
                    }
                    

                    if (dist < threshold){
                        const m1 = this.objects[i].mass;
                        const m2 = this.objects[ni].mass;

                        const ndx = (dx / dist);
                        const ndy = (dy / dist);
                        
                        this.objects[i].pos[0] += ndx * (threshold-dist) * (1 - m1/(m1+m2));
                        this.objects[i].pos[1] += ndy * (threshold-dist) * (1 - m1/(m1+m2));

                        this.objects[ni].pos[0] -= ndx * (threshold-dist) * (1 - m2/(m1+m2));
                        this.objects[ni].pos[1] -= ndy * (threshold-dist) * (1 - m2/(m1+m2));
                    }
                }
            }
        }
    }

    this.getNeigbours = function(particleIndex){
        const cellx = Math.floor((this.objects[particleIndex].pos[0] + this.maxSize) / this.maxSize);
        const celly = Math.floor((this.objects[particleIndex].pos[1] + this.maxSize) / this.maxSize);
        
        let PossibleNeighboors = 0b111111111;
        if (cellx == 0){
            PossibleNeighboors = PossibleNeighboors & 0b110110110;
        } else if (cellx == Math.floor((boundX + (2 * this.maxSize))/this.maxSize)){
            PossibleNeighboors = PossibleNeighboors & 0b011011011;
        }
        if (celly == 0){
            PossibleNeighboors = PossibleNeighboors & 0b111111000;
        } else if (celly == Math.floor((boundY + (2 * this.maxSize))/this.maxSize)){
            PossibleNeighboors = PossibleNeighboors & 0b000111111;
        }
    
        let neighboors = [];
        for (let i = 0; i < 9; i++){
            if (((PossibleNeighboors >> i) & 0b000000001) == 0){continue;}
            neighboors = neighboors.concat(this.cells[cellx+(-1+(i%3))][celly+(-1+(Math.floor(i/3)))]);
        }
        
        return neighboors;
    }

    this.setup = function(){
        //this.objects.push(new VerletObject([220,400], 5, 10, [255,0,0], this));
    }
}

function VerletObject(pos, size, mass, color, solver){
    this.pos = pos;
    this.oldPos = pos;
    this.acceleration = [0,0];

    this.size = size;
    this.mass = mass;

    this.color = color;

    this.updatePosition = function(deltaTime){
        const vel = [this.pos[0] - this.oldPos[0], this.pos[1] - this.oldPos[1]];
        //save pos
        this.oldPos = this.pos;
        //apply verlet
        this.pos = [this.pos[0] + vel[0] + this.acceleration[0] * deltaTime * deltaTime, this.pos[1] + vel[1] + this.acceleration[1] * deltaTime * deltaTime];
        //reset acceleration
        this.acceleration = [0,0];
    }

    this.accelerate = function(acc){
        this.acceleration[0] += acc[0];
        this.acceleration[1] += acc[1];
    }

    this.onConstruction = function(){
        if (size*2 > solver.maxSize){
            solver.maxSize = size*2;
        }
    }

    this.onConstruction();
}