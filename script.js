const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const boundX = window.innerWidth;
const boundY = window.innerHeight;
canvas.width = boundX;
canvas.height = boundY;

const imageData = ctx.createImageData(boundX, boundY);

let paused = false;
const simSpeed = 1;

let toBeCleared = [];

//timing setup
let prevTs;

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

    prevTs = window.performance.now() / 1000
	requestAnimationFrame(frame);
}

function frame() {
	//calculate DeltaTime
	let now = (window.performance.now() / 1000);
	let deltaTime = (now - prevTs) * simSpeed;
	prevTs = now;

	if(!paused){
		update(deltaTime);
		draw();
	}
	//Recursive function (call itself)
	requestAnimationFrame(frame);
}

function update(deltaTime){

}

function draw(){
    //clear prev frame
    for (let i = 0; i < toBeCleared.length; i++){
		let base = (toBeCleared[i][0] + toBeCleared[i][1] * boundX) * 4;

		imageData.data[base] = 255;
		imageData.data[base+1] = 255;
		imageData.data[base+2] = 255;
	}
	toBeCleared = [];
    
    //draw calls
    putCircle(500,500, 10, [0,0,0]);

    //draw frame
    ctx.putImageData(imageData, 0, 0);
}

function putCircle(x, y, r, color) {
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