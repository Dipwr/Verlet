const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const boundX = window.innerWidth;
const boundY = window.innerHeight;
canvas.width = boundX;
canvas.height = boundY;

const imageData = ctx.createImageData(boundX, boundY);

let paused = false;
const simSpeed = 1;

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
    //initialise the canvas array
	for (let i = 0; i < boundX*boundY*4; i += 4){
		imageData.data[i] = 255;
		imageData.data[i+1] = 255;
		imageData.data[i+2] = 255;
		imageData.data[i+3] = 255;
	}

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
        solver.objects.push(new VerletObject([580,400], 5, 1, [Math.random()*255,Math.random()*255,Math.random()*255], solver));
        dtAcc = 0;
    }
}

function update(deltaTime){
    solver.update(deltaTime, 4);
}

function draw(deltaTime){
    //clear prev frame
    for (let i = 0; i < toBeCleared.length; i++){
		let base = (toBeCleared[i][0] + toBeCleared[i][1] * boundX) * 4;

		imageData.data[base] = 255;
		imageData.data[base+1] = 255;
		imageData.data[base+2] = 255;
	}
	toBeCleared = [];
    
    //draw calls
    putCircle([400,400], 200, [128,128,128]);//constraint

    for (let i = 0; i < solver.objects.length; i++){
        const obj = solver.objects[i];
        putCircle(obj.pos, obj.size, obj.color);
    }

    //draw frame
    ctx.putImageData(imageData, 0, 0);

    ctx.font = "10px Arial";
    ctx.fillText("FPS: " + (1/deltaTime).toFixed(2),10,10);
    ctx.fillText("D.T.: " + (deltaTime*1000).toFixed(2) + "ms",10,20);
}

function putCircle(pos, r, color) {
    const x = Math.round(pos[0]);
    const y = Math.round(pos[1]);
	for (let i = 0; i < r*r; i++){
		x1 = (i % (r));
		y1 = Math.floor(i / (r));
		
		if(x1*x1 + y1*y1 < r*r){
			putPixel(x+x1, y+y1, color);
			putPixel(x-x1, y+y1, color);
			putPixel(x+x1, y-y1, color);
			putPixel(x-x1, y-y1, color);
		}
		
	}
}

function putPixel(x, y, color){
	let base = (x + y * boundX) * 4;

	imageData.data[base] = color[0];
	imageData.data[base+1] = color[1];
	imageData.data[base+2] = color[2];

	toBeCleared.push([x,y]);
}

function Solver(){
    this.objects = [];

    this.cells = [];

    this.gravity = [0, 1000];

    this.maxSize = 0;

    this.update = function(deltaTime, subSteps){
        this.applyGravity();
        this.updatePositions(deltaTime);
        for(let i = 0; i < subSteps; i++){
            this.solveCollisions()
            this.applyConstraint([400,400], 200);
        }
    }

    this.updatePositions = function(deltaTime){
        //clear the cells
        this.cells = [];
	    for (let i = 0; i < Math.ceil(boundX/this.maxSize); i++){
            this.cells.push([]);
            for (let j = 0; j < Math.ceil(boundY/this.maxSize); j++){
                this.cells[i].push([]);
            }
        }

        for (let i = 0; i < this.objects.length; i++){
            this.objects[i].updatePosition(deltaTime);

            let cellx = Math.floor(this.objects[i].pos[0] / this.maxSize);
		    let celly = Math.floor(this.objects[i].pos[1] / this.maxSize);
		    this.cells[cellx][celly].push(i);
        }
    }

    this.applyGravity = function(){
        for (let i = 0; i < this.objects.length; i++){
            this.objects[i].accelerate(this.gravity); 
        }
    }

    this.applyConstraint = function(center, r){
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

    this.solveCollisions = function(){
        if (this.objects.length > 1){
            for (let i = 0; i < this.objects.length; i++){
                let neighboors = this.getNeigbours(i);
                for (let j = 0; j < neighboors.length; j++){
                    const ni = neighboors[j];
                    if(i == ni){continue;}
                    const threshold = this.objects[i].size + this.objects[ni].size;

                    dx = this.objects[i].pos[0] - this.objects[ni].pos[0];
                    dy = this.objects[i].pos[1] - this.objects[ni].pos[1];

                    dist = Math.sqrt(dx*dx + dy*dy);

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
        let cellx = Math.floor(this.objects[particleIndex].pos[0] / this.maxSize);
        let celly = Math.floor(this.objects[particleIndex].pos[1] / this.maxSize);
        
        let PossibleNeighboors = [true,true,true,true,true,true,true,true,true];
        if (cellx == 0){
            PossibleNeighboors[0] = false;
            PossibleNeighboors[3] = false;
            PossibleNeighboors[6] = false;
        }
        if (cellx == Math.floor(boundX/this.maxSize)){
            PossibleNeighboors[2] = false;
            PossibleNeighboors[5] = false;
            PossibleNeighboors[8] = false;
        }
        if (celly == 0){
            PossibleNeighboors[0] = false;
            PossibleNeighboors[1] = false;
            PossibleNeighboors[2] = false;
        }
        if (celly == Math.floor(boundY/this.maxSize)){
            PossibleNeighboors[6] = false;
            PossibleNeighboors[7] = false;
            PossibleNeighboors[8] = false;
        }
    
        let neighboors = [];
        for (let i = 0; i < 9; i++){
            if (PossibleNeighboors[i] == false){continue;}
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
        if (size > solver.maxSize*2){
            solver.maxSize = size*2;
        }
    }

    this.onConstruction();
}