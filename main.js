// ==============================
// 1. SETUP: CANVAS AND GAME LOOP
// ==============================

// Get the canvas element where everything will be drawn
const canvas = document.getElementById('bezier-canvas');

// Get the 2D drawing context from the canvas
const ctx = canvas.getContext('2d');

// Span element used to display current control mode
const controlStatusSpan = document.getElementById('control-status');

// Simple Point class to store x and y coordinates
// This helps in keeping the code cleaner instead of using plain objects
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

// ==============================
// CONTROL STATE VARIABLES
// ==============================

// activeControl decides which control point responds to mouse input
// Possible values: 'ALL', 'P1', 'P2', 'LOCKED'
let activeControl = 'ALL'; 

// Radius used to detect mouse clicks near control points
const HIT_RADIUS = 25;

// Fixed end points of the Bézier curve
let P0, P3;

// Movable control points of the Bézier curve
let P1, P2;

// Stores current mouse position
let mousePos = new Point(0, 0);

// ==============================
// PHYSICS PARAMETERS
// ==============================

// Spring stiffness value (higher means stiffer movement)
let SPRING_K = 50;    

// Damping value to reduce oscillations
let DAMPING = 8;   

// Length used for visualizing tangent lines
let TANGENT_LENGTH = 50;

// ==============================
// CANVAS RESIZE & INITIALIZATION
// ==============================

// Resizes canvas and initializes control points
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Initial vertical positions
    const initialY = canvas.height / 4;
    const middleY = canvas.height / 2;
    
    // Fixed endpoints of the curve
    P0 = new Point(300, middleY);
    P3 = new Point(canvas.width - 300, middleY);
    
    // Initialize control points only once
    if (!P1) {
        P1 = {
            position: new Point(canvas.width / 4, initialY),
            velocity: new Point(0, 0),
            target: new Point(canvas.width / 4, initialY)
        };
        P2 = {
            position: new Point(canvas.width * 3 / 4, initialY),
            velocity: new Point(0, 0),
            target: new Point(canvas.width * 3 / 4, initialY)
        };
    } else {
        // On resize, only update fixed endpoints
        P0.x = 100; 
        P0.y = middleY;
        P3.x = canvas.width - 100; 
        P3.y = middleY;
    }
}

// Initial setup and resize handling
resizeCanvas(); 
window.addEventListener('resize', resizeCanvas);

// Used to calculate delta time between frames
let lastTime = 0;

// ==============================
// BEZIER MATHEMATICS
// ==============================

// Calculates a point on a cubic Bézier curve for a given t value
function getBezierPoint(t, p0, p1, p2, p3) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const c0 = mt3; 
    const c1 = 3 * mt2 * t;
    const c2 = 3 * mt * t2;
    const c3 = t3; 

    const x = c0 * p0.x + c1 * p1.x + c2 * p2.x + c3 * p3.x;
    const y = c0 * p0.y + c1 * p1.y + c2 * p2.y + c3 * p3.y;

    return new Point(x, y);
}

// Calculates tangent (direction vector) of the Bézier curve at t
function getBezierTangent(t, p0, p1, p2, p3) {
    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;

    const v1x = p1.x - p0.x;
    const v1y = p1.y - p0.y;
    const v2x = p2.x - p1.x;
    const v2y = p2.y - p1.y;
    const v3x = p3.x - p2.x;
    const v3y = p3.y - p2.y;
    
    const c0 = 3 * mt2;
    const c1 = 6 * mt * t;
    const c2 = 3 * t2;

    const dx = c0 * v1x + c1 * v2x + c2 * v3x;
    const dy = c0 * v1y + c1 * v2y + c2 * v3y;

    return new Point(dx, dy);
}

// ==============================
// PHYSICS MODEL (SPRING-DAMPER)
// ==============================

// Applies spring physics to smoothly move control points
function applySpringPhysics(p, deltaTime) {
    // Distance between current position and target
    const displacementX = p.target.x - p.position.x;
    const displacementY = p.target.y - p.position.y;

    // Spring force pulls the point toward the target
    const springForceX = displacementX * SPRING_K;
    const springForceY = displacementY * SPRING_K;

    // Damping force slows down the motion
    const dampingForceX = -p.velocity.x * DAMPING;
    const dampingForceY = -p.velocity.y * DAMPING;

    // Acceleration calculation (mass assumed to be 1)
    const accelX = springForceX + dampingForceX;
    const accelY = springForceY + dampingForceY;

    // Update velocity
    p.velocity.x += accelX * deltaTime;
    p.velocity.y += accelY * deltaTime;
    
    // Update position
    p.position.x += p.velocity.x * deltaTime;
    p.position.y += p.velocity.y * deltaTime;
}

// ==============================
// INPUT HANDLING
// ==============================

// Update mouse position when mouse moves (unless locked)
canvas.addEventListener('mousemove', (e) => {
    if (activeControl !== 'LOCKED') {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
    }
});

// Handle mouse clicks for selecting control points or modes
canvas.addEventListener('click', (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    // Utility function to calculate squared distance
    function distanceSq(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }

    const clickPoint = new Point(clickX, clickY);
    const p1DistSq = distanceSq(clickPoint, P1.position);
    const p2DistSq = distanceSq(clickPoint, P2.position);
    const hitThresholdSq = HIT_RADIUS * HIT_RADIUS;
    
    let newControl = activeControl;

    // Check if P1 is clicked
    if (p1DistSq < hitThresholdSq) {
        newControl = 'P1';
    } 
    // Check if P2 is clicked
    else if (p2DistSq < hitThresholdSq) {
        newControl = 'P2';
    }
    // Otherwise toggle between ALL and LOCKED
    else {
        if (activeControl === 'LOCKED') {
            newControl = 'ALL';
        } else {
            newControl = 'LOCKED';
        }
    }
    
    activeControl = newControl;
    updateControlStatus();
});

// Updates the control mode text and color
function updateControlStatus() {
    switch(activeControl) {
        case 'ALL':
            controlStatusSpan.textContent = 'ALL (Both Pts)';
            controlStatusSpan.style.color = '#007bff';
            break;
        case 'P1':
            controlStatusSpan.textContent = 'P1 Selected (Blue)';
            controlStatusSpan.style.color = '#0000AA';
            break;
        case 'P2':
            controlStatusSpan.textContent = 'P2 Selected (Blue)';
            controlStatusSpan.style.color = '#0000AA';
            break;
        case 'LOCKED':
            controlStatusSpan.textContent = 'LOCKED (Input Paused)';
            controlStatusSpan.style.color = '#CC0000';
            break;
    }
}

// ==============================
// SLIDER CONTROLS
// ==============================

const sliderK = document.getElementById('springK');
const sliderD = document.getElementById('damping');
const sliderT = document.getElementById('tangentLength');

const kValueSpan = document.getElementById('k-value');
const dValueSpan = document.getElementById('d-value');
const tValueSpan = document.getElementById('t-value');

// Update physics values based on sliders
sliderK.addEventListener('input', (e) => {
    SPRING_K = parseFloat(e.target.value);
    kValueSpan.textContent = SPRING_K;
});

sliderD.addEventListener('input', (e) => {
    DAMPING = parseFloat(e.target.value);
    dValueSpan.textContent = DAMPING;
});

sliderT.addEventListener('input', (e) => {
    TANGENT_LENGTH = parseFloat(e.target.value);
    tValueSpan.textContent = TANGENT_LENGTH;
});

// ==============================
// RENDERING
// ==============================

// Draws a circular point on the canvas
function drawPoint(point, color, radius) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
}

// Main drawing function
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
        
    const p1Pos = P1.position;
    const p2Pos = P2.position;

    // Draw helper lines between points
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);
    ctx.lineTo(p1Pos.x, p1Pos.y);
    ctx.moveTo(P3.x, P3.y);
    ctx.lineTo(p2Pos.x, p2Pos.y);
    ctx.stroke();

    // Draw tangent lines along the curve
    ctx.strokeStyle = '#CC0000'; 
    const tangentTs = [0.1, 0.3, 0.5, 0.7, 0.9]; 

    tangentTs.forEach(t => {
        const P = getBezierPoint(t, P0, p1Pos, p2Pos, P3);
        const T = getBezierTangent(t, P0, p1Pos, p2Pos, P3);

        const length = Math.sqrt(T.x * T.x + T.y * T.y);
        if (length === 0) return;

        const Tx_unit = T.x / length;
        const Ty_unit = T.y / length;
        const normalX = -Ty_unit;
        const normalY =  Tx_unit;

        const offset = 6;

        const startX = P.x - Tx_unit * TANGENT_LENGTH + normalX * offset;
        const startY = P.y - Ty_unit * TANGENT_LENGTH + normalY * offset;
        const endX   = P.x + Tx_unit * TANGENT_LENGTH + normalX * offset;
        const endY   = P.y + Ty_unit * TANGENT_LENGTH + normalY * offset;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    });
        
    // Draw Bézier curve
    ctx.strokeStyle = '#3333FF'; 
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(P0.x, P0.y);

    for (let i = 1; i <= 100; i++) {
        const t = i / 100;
        const point = getBezierPoint(t, P0, p1Pos, p2Pos, P3);
        ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();

    // Draw control points
    drawPoint(P0, '#000000', 8); 
    drawPoint(P3, '#000000', 8); 

    const p1Color = (activeControl === 'P1' || activeControl === 'ALL') ? '#0000AA' : '#AAAAFF';
    drawPoint(p1Pos, p1Color, (activeControl === 'P1' ? 15 : 12)); 

    const p2Color = (activeControl === 'P2' || activeControl === 'ALL') ? '#0000AA' : '#AAAAFF';
    drawPoint(p2Pos, p2Color, (activeControl === 'P2' ? 15 : 12)); 
}

// ==============================
// MAIN LOOP
// ==============================

// Updates control point targets and applies physics
function update(deltaTime) {
    if (activeControl === 'P1' || activeControl === 'ALL') {
        P1.target.x = mousePos.x - 100;
        P1.target.y = mousePos.y - 50;
    } 

    if (activeControl === 'P2' || activeControl === 'ALL') {
        P2.target.x = mousePos.x + 100;
        P2.target.y = mousePos.y + 50;
    }

    applySpringPhysics(P1, deltaTime);
    applySpringPhysics(P2, deltaTime);
}

// Game loop using requestAnimationFrame
function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 1 / 30);

    update(deltaTime);
    draw();

    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
}

// Start everything
updateControlStatus();
gameLoop(0);
