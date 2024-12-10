const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d", { alpha: false });

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
    if (dtAcc >= 0.01){
        for (let i = 0; i < 3; i++){
            const obj = new VerletObject([100,100 + (50*i)], 4, 1, [Math.random()*255,Math.random()*255,Math.random()*255], solver);
            obj.accelerate([300000,0]);
            solver.objects.push(obj);
        }
        dtAcc = 0;
    }
}

function update(deltaTime){
    solver.update(deltaTime, 8, 1);
}

function draw(deltaTime){
    //console.log("F.P.S.: " + (1/deltaTime).toFixed(2),"D.T.: " + (deltaTime*1000).toFixed(2) + "ms","Particles: " + solver.objects.length);
    //clear prev frame
    ctx.clearRect(0, 0, boundX, boundY);
    
    //draw calls
    ctx.font = "10px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("F.P.S.: " + (1/deltaTime).toFixed(2),10,10);
    ctx.fillText("D.T.: " + (deltaTime*1000).toFixed(2) + "ms",10,20);
    ctx.fillText("Particles: " + solver.objects.length,10,30);

    //constraints    
    ctx.fillStyle = "rgb(128 128 128)";
    ctx.fillRect(50,50,700,700);
    //drawCircle([400,400], 400, "rgb(100 100 100)");
    if(mouseDown){
        drawCircle(mousePos, mouseSize, false, "rgb(255 0 0)", 2);
    }

    //particles
    for (let i = 0; i < solver.objects.length; i++){
        const obj = solver.objects[i];
        drawCircle(obj.pos, obj.size, `rgb(${obj.color[0]} ${obj.color[1]} ${obj.color[2]})`);
    }
}

function drawCircle(pos, r, fill, stroke, strokeWidth) {
    const x = Math.floor(pos[0]);
    const y = Math.floor(pos[1]);

    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI, false)
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (stroke) {
      ctx.lineWidth = strokeWidth
      ctx.strokeStyle = stroke
      ctx.stroke()
    }
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
                for (let j = 0; j < iterations; j++){
                    this.solveCollisions();
                    this.applyConstraints();
                }
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
            if (this.objects[i].pos[0] < (center[0] - size[0]/2) + this.objects[i].size) {
                this.objects[i].pos[0] = (center[0] - size[0]/2) + this.objects[i].size;
            } else if(this.objects[i].pos[0] > (center[0] + size[0]/2) - this.objects[i].size){
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
                dx = this.objects[i].pos[0] - mousePos[0];
                dy = this.objects[i].pos[1] - mousePos[1];

                const sqdist = dx*dx + dy*dy
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