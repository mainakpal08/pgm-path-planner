'use strict';

let log = console.log.bind(console);

// DOM references
const canvas = document.getElementById('canvas');
const output = document.getElementById('output');
const ctx = canvas.getContext('2d');

// Rviz yaml params (to retrieve from file)
const origin_offset_x = -9.399999999999991;
const origin_offset_y = -5.6;
const resolution = 0.05;

// Runtime variables and output
let mousePos;
let savedWaypoints = new Waypoints();
const selectedWaypointIndex = {
    set current(index) {
        this._index = index;
        updateSelectedWaypointUi();
    },
    get current() {
        return this._index;
    },
    _index: null
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function exportSavedWaypoints() {
    let exportedData = savedWaypoints.exportToRvizWaypoints();
    log(JSON.stringify(exportedData));
}


function deleteSelectedWaypoint() {
    if (selectedWaypointIndex.current != null) {
        savedWaypoints.removeWaypoint(selectedWaypointIndex.current);

        // Update the selected waypoint index
        if (selectedWaypointIndex.current >= savedWaypoints.waypoints.length) {
            selectedWaypointIndex.current = savedWaypoints.waypoints.length - 1;
        }

        // If there are no waypoints left, set the selected index to null
        if (savedWaypoints.waypoints.length === 0) {
            selectedWaypointIndex.current = null;
        }

        updateScene();
    }
}


function updateSavedWaypointListUi() {
    let waypoints = savedWaypoints.waypoints;
    const point_list = document.getElementById("point_list");
    point_list.innerHTML = ''; // Clear the list before updating
    for (let i = 0; i < waypoints.length; i++) {
        let li = document.createElement("li");
        li.appendChild(document.createTextNode(i));
        li.setAttribute("onclick", `selectWaypoint(${i})`);
        point_list.appendChild(li);
    }
}

function selectWaypoint(index) {
    selectedWaypointIndex.current = index;
    updateSelectedWaypointUi();
}


function updateSelectedWaypointUi() {
    document.getElementById("property_id").innerHTML = selectedWaypointIndex.current;
}

function updateScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas before redrawing
    updateSavedWaypointListUi();
    updateSelectedWaypointUi();
    if (imageData) {
        ctx.putImageData(imageData, 0, 0);
    }
    savedWaypoints.draw();
}

//-- pgm file data--//
let fileType = "";
let hv = "";
let maxWhiteVal = "";
let imageData;
//------------------//
let fr = new FileReader();
fr.onload = async function(e) {
    let bytes = new Uint8Array(fr.result);
    let line = 0;
    let dataI = 0;

    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i] == 10) { // newline check
            line++;
            if (line == 1) {
                fileType = fileType.trim();
                log("Filetype: " + fileType);
                if (fileType != "P5") {
                    log("Unhandled file type: " + fileType);
                    return;
                }
            } else if (line == 3) {
                hv = hv.trim().split(" ");
                let width = parseInt(hv[0]);
                let height = parseInt(hv[1]);
                canvas.width = width;
                canvas.height = height;
                imageData = ctx.createImageData(width, height);
                log("Dimensions: " + width + "x" + height);
            } else if (line == 4) {
                maxWhiteVal = maxWhiteVal.trim();
                log("Max White Value: " + maxWhiteVal);
            }
            continue;
        }
        if (line == 0) {
            fileType += String.fromCharCode(bytes[i]);
        } else if (line == 2) {
            hv += String.fromCharCode(bytes[i]);
        } else if (line == 3) {
            maxWhiteVal += String.fromCharCode(bytes[i]);
        } else {
            if (imageData && dataI < imageData.data.length) {
                let val = 255 * bytes[i] / parseInt(maxWhiteVal);
                imageData.data[dataI + 0] = val; // R value
                imageData.data[dataI + 1] = val; // G value
                imageData.data[dataI + 2] = val; // B value
                imageData.data[dataI + 3] = 255; // A value
                dataI += 4;
            }
        }
    }
    if (imageData) {
        ctx.putImageData(imageData, 0, 0);
        updateScene();
    }
}

function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

// Define the transformation matrix A and translation vector t
const A = [
    [0.9964, -0.0003],
    [0.0007, 0.9986]
];
const t = [3.0478, 6.9709];

// Function to calculate the inverse of a 2x2 matrix
function inverseMatrix(matrix) {
    const determinant = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
    return [
        [matrix[1][1] / determinant, -matrix[0][1] / determinant],
        [-matrix[1][0] / determinant, matrix[0][0] / determinant]
    ];
}

// Calculate the inverse of A
const A_inv = inverseMatrix(A);

// Function to perform matrix-vector multiplication
function multiplyMatrixVector(matrix, vector) {
    return [
        matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
        matrix[1][0] * vector[0] + matrix[1][1] * vector[1]
    ];
}

// Function to transform back to the original coordinates
function transformedToOriginal(x, y) {
    const p_transformed = [x, y];
    const p_diff = [p_transformed[0] - t[0], p_transformed[1] - t[1]];
    const p_original = multiplyMatrixVector(A_inv, p_diff);
    return p_original;
}

// Adapted getRvizPoint function to return original coordinates
function getRvizPoint(mousePos) {
    const x_transformed = mousePos.x * resolution + origin_offset_x;
    const y_transformed = (canvas.height - mousePos.y) * resolution + origin_offset_y;
    const [x_original, y_original] = transformedToOriginal(x_transformed, y_transformed);
    return new Point(x_original, y_original);
}

canvas.addEventListener('mousemove', debounce(function(evt) {
    mousePos = getMousePos(canvas, evt);
    let rvizPos = getRvizPoint(mousePos);
    let message = "(" + rvizPos.x + ", " + rvizPos.y + ")";
	//log(message);

    if (translateWaypointFlag) {
        savedWaypoints.setWaypointPosition(selectedWaypointIndex.current, mousePos.x, mousePos.y);
        updateScene();
    }
}, 10), false);

let isMouseDown = false;
let addWaypointFlag = false;
let translateWaypointFlag = false;

let selectedWaypointIndexForEdge = null;

canvas.addEventListener('mousedown', function(evt) {
    isMouseDown = true;
    let rvizPoint = getRvizPoint(mousePos);

    let hits = savedWaypoints.hit(mousePos);
    if (hits.length > 0) {
        log(hits);
        if (selectedWaypointIndexForEdge === null) {
            selectedWaypointIndexForEdge = hits[0];
        } else {
            savedWaypoints.addEdge(selectedWaypointIndexForEdge, hits[0]);
            selectedWaypointIndexForEdge = null;
            updateScene();
        }
        selectedWaypointIndex.current = hits[0];
        checkMouseHold();
    } else {
        if (selectedWaypointIndex.current != null) {
            selectedWaypointIndex.current = null;
        } else {
            addWaypointFlag = true;
        }
    }

}, false);

canvas.addEventListener('mouseup', function(evt) {
    if (isMouseDown && imageData != null) {
        if (addWaypointFlag) {
            savedWaypoints.push(new Pose(mousePos));
            updateScene();
            addWaypointFlag = false;
        } else if (translateWaypointFlag) {
            translateWaypointFlag = false;
        }
    }
    isMouseDown = false;
}, false);

let holdTime = 0;
const editTriggerTime = 500; //hold mouse down for --ms to trigger
async function checkMouseHold() {
    translateWaypointFlag = false;
    log("timer started");
    holdTime = 0;
    while (holdTime < editTriggerTime) {
        if (!isMouseDown) {
            log("timer ended prematurely");
            return;
        }
        await sleep(5);
        holdTime += 5;
    }

    log("flag activated");
    translateWaypointFlag = true;
}

function updateCanvas() {
    fr.readAsArrayBuffer(this.files[0]);
}
document.getElementById("input").addEventListener("change", updateCanvas, false);

let importedPoints = [
];

function start() {
    for (let i = 0; i < importedPoints.length; i++) {
        let p = new Pose(new Point(importedPoints[i][0], importedPoints[i][1]));
        log(p);
        savedWaypoints.pushRvizPose(p);
    }
    updateScene();
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function editSelectedWaypoint() {
    if (selectedWaypointIndex.current != null) {
        let label = prompt("Enter annotation text:", savedWaypoints.waypoints[selectedWaypointIndex.current].label);
        if (label !== null) {
            savedWaypoints.waypoints[selectedWaypointIndex.current].label = label;
            updateScene();
        }
    }
}
