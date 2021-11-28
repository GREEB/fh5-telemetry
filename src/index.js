import * as THREE from 'three'
import { GUI } from 'three/examples/jsm/libs/dat.gui.module'
import Papa from 'papaparse'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let lastPointCount
let camera, controls, scene, renderer;

let nonLinearPoints = [];
let nonLinearColor = [];
let nonLinearColorTerrain = [];
let geometry, positions, iterator, colors, colors2


// will contain all the shapes
let mainContainer;
let pointCloud = null;
let box = null;

// letiable managed by DAT.GUI
let guilet = null;
let gui = new GUI();
let guiControllers = {};

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();


let lastBgColor = [50, 50, 50];
const takeRight = (arr, qty = 1) => [...arr].splice(-qty, qty)

init();
//animate();


// initialize the UI
function initDatGui() {

	guilet = {
		backgroundColor: lastBgColor,
		boxVisible: false
	};
	let element = document.querySelector('.dg div ul');
	let p = document.createElement("p")

	p.textContent = `Help Finish this pointMap of forza horizon 5\n
					Just add the ip and port from below into your data out settings in FH5 and your done.
					`
	p.setAttribute("style", "font-size:1.5em;text-align: left;");
	element.append(p)


	gui.add({Github: "https://github.com/fh5-telemetry"}, 'Github')
	gui.add({DataOutIP: "securityb.us"}, 'DataOutIP')
	gui.add({Port: "5300"}, 'Port')

	guiControllers["backgroundColor"] = gui.addColor(guilet, 'backgroundColor')
		.name("Background")
		.onChange(function (value) {
			setBackgroundColor(value);
		})
		guiControllers["boxVisible"] = gui.add(guilet, 'boxVisible')
		.name("Bounding box")
		.onChange(function (value) {
			box.visible = value;
		})

		gui.add({ColorSchema:"Height"}, 'ColorSchema', [ 'Height', 'Terrain'] ).onChange(function (v) {
			if (v == 'Height'){
				addParticles(2)
						}else{
				addParticles(1)
			}
		})

}


/**
* Change the background color
* @param [Array] arrayRGB - must be [r, g, b] with r, g, and b in [0, 255]
*/
function setBackgroundColor(arrayRGB) {
	lastBgColor = arrayRGB;
	renderer.setClearColor(new THREE.Color().setRGB(arrayRGB[0] / 256, arrayRGB[1] / 256, arrayRGB[2] / 256));
	//renderer.clear(true, true, true);
}


// INIT
function init() {
	THREE.Object3D.DefaultUp = new THREE.Vector3(0,0,1);
	// init the file opener

	window.addEventListener('mousemove', onMouseMove, false);
	window.addEventListener('mousedown', onMouseDown, true);
	initDatGui();
	scene = new THREE.Scene();

	renderer = new THREE.WebGLRenderer({
		preserveDrawingBuffer: false,
		antialias: true
	});

	setBackgroundColor(guilet.backgroundColor);

	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);

	let container = document.getElementById('container');
	container.appendChild(renderer.domElement);
	camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 20000);
	controls = new OrbitControls(camera, renderer.domElement);

	//controls = new TrackballControls(camera, renderer.domElement);
	controls.addEventListener('change', render);
	//controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
	// controls.rotateSpeed = 10.0;
	// controls.zoomSpeed = 3;
	// controls.panSpeed = 0.8;
	// controls.noZoom = false;
	// controls.noPan = false;
	// controls.staticMoving = true;
	// controls.dynamicDampingFactor = 0.3;

	// Object hierarchy
	mainContainer = new THREE.Object3D();
	scene.add(mainContainer);

	// stats = new Stats();
	// container.appendChild(stats.dom);

	window.addEventListener('resize', onWindowResize, false);
}


// ON RESIZE
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}


function render() {
	renderer.render(scene, camera);
}

// animate
function animate() {
	requestAnimationFrame(animate);
	controls.update(); // required if controls.enableDamping = true, or if controls.autoRotate = true
	// stats.update();
	render();
	
}


function addParticles(colorsel) {
	console.log('addpar with col: ' + colorsel);
	let nbParticles = nonLinearPoints.length;
	lastPointCount = nonLinearPoints.length
	geometry = new THREE.BufferGeometry();
	positions = new Float32Array(nbParticles * 3);
	colors = new Float32Array(nbParticles * 3);
	colors2 = new Float32Array(nbParticles * 3);

	iterator = 0;

	for (let i = 0; i < nbParticles; i++) {

		// positions
		positions[iterator] = nonLinearPoints[i][0];
		positions[iterator + 1] = nonLinearPoints[i][1];
		positions[iterator + 2] = nonLinearPoints[i][2];

		// colors

		colors[iterator] = nonLinearColor[i][0];
		colors[iterator + 1] = nonLinearColor[i][1];
		colors[iterator + 2] = nonLinearColor[i][2];

		colors2[iterator] = nonLinearColorTerrain[i][0];
		colors2[iterator + 1] = nonLinearColorTerrain[i][1];
		colors2[iterator + 2] = nonLinearColorTerrain[i][2];

		iterator += 3;
	}

	geometry.setAttribute('position', new THREE.BufferAttribute(positions.subarray(0, iterator), 3));
	if (colorsel == 1){
		geometry.setAttribute('color', new THREE.BufferAttribute(colors.subarray(0, iterator), 3));
	}else{
		geometry.setAttribute('color', new THREE.BufferAttribute(colors2.subarray(0, iterator), 3));
	}
	geometry.computeBoundingSphere();
	geometry.computeBoundingBox();
	let pointMaterial = new THREE.PointsMaterial({ size: 25, vertexColors: THREE.VertexColors });

	pointCloud = new THREE.Points(geometry, pointMaterial);
	mainContainer.add(pointCloud);
	mainContainer.remove(box);
	box = new THREE.BoxHelper(pointCloud, 0x1a1a1a);
	box.visible = false
	mainContainer.add(box);
	geometry.computeBoundingSphere();
	geometry.computeBoundingBox();

	printLoadInfo(nbParticles + " points");


	onDone(geometry, colors, colors2);
	animate()
}


let oldcount = 0
let count = 0
setInterval(() => {
	fetch('pos.txt') // fetch text file
		.then((resp) => resp.text())
		.then(data => {
			// Flip numbers for map


			if (oldcount == 0) {
				oldcount = data.split('\n').length
				return;
			} else {
				count = data.split('\n')

				let diff = count.length - oldcount
				if (diff == 0) {
					return;
				}
				console.log(count.length - oldcount);
				let cvs = takeRight(count, diff).join('\n')
				console.log(cvs);
				handleDataPos(cvs)
				oldcount = data.split('\n').length
			}

		})
}, 5000);



console.log('addingg data');
fetch('pos.txt') // fetch text file
	.then((resp) => resp.text())
	.then(data => {
		handleDataPos(data)

	})

	function scaleValue(value, from, to) {
		var scale = (to[1] - to[0]) / (from[1] - from[0]);
		var capped = Math.min(from[1], Math.max(from[0], value)) - from[0];
		return ~~(capped * scale + to[0]);
	}
const handleDataPos = (d) => {
	printLoadInfo("Parsing point list file...");

	let counter = 0;
	Papa.parse(d, {
		delimiter: ' ',
		worker: true,

		step: function (results) {

			// if no error && some data
			if (!results.errors.length && results.data.length) {

				// eachj point must be 3D
				if (results.data.length < 3)
					return;
				// Color by height

				// Color by terrain
	
					let rgb = [100 / 255, 100 / 255, results.data[1] / 510]
					nonLinearColorTerrain.push(rgb);
				
				// Color by terrain
				if (results.data[3] == 1) {
					// Dirt
					let rgb = [136 / 255, 119 / 255, 89 / 255]
					nonLinearColor.push(rgb);
				} else if (results.data[3] == 2) {
					// Water
					let rgb = [30 / 255, 62 / 255, 73 / 255]
					nonLinearColor.push(rgb);
				} else {
					let rgb = [205 / 255, 205 / 255, 205 / 255]
					nonLinearColor.push(rgb);
				}
				let xyz = [
					parseFloat(results.data[1]),
					parseFloat(results.data[0]),
					parseFloat(results.data[2])
				]
				nonLinearPoints.push(xyz);

				printLoadInfo(counter + " points parsed...");
				counter++;
			}
		},

		complete: function (results) {
			console.log("all " + nonLinearPoints.length + " points parsed.");
			printLoadInfo("");
			addParticles()

		}

	});
}


function printLoadInfo(s) {
	document.getElementById("loadInfo").innerHTML = s;
}




function onDone(geometry, colors, colors2) {
	onDone = function () { };
	pointCloud.geometry.attributes.position.needsUpdate = true;
	let boxCenter = geometry.boundingBox.getCenter();
	  
	camera.position.x = 8856.6499268162654
	camera.position.y = -1652.100896578187
	camera.position.z = 1000
	controls.target.copy(geometry.boundingBox.getCenter());


	
		

}

function onMouseMove(event) {

	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
	mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
}


function onMouseDown(event) {

	if (event.shiftKey) {

		raycaster.setFromCamera(mouse, camera);
		let intersects = raycaster.intersectObject(pointCloud);
		if (intersects.length) {
			controls.target.copy(intersects[0].point.clone());
		}
	}
}

export { init }